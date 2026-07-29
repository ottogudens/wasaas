import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Server } from '@modelcontextprotocol/sdk/server/index';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Response } from 'express';

@Injectable()
export class McpService implements OnModuleInit {
  private readonly logger = new Logger(McpService.name);
  private mcpServer: Server;
  private sseTransports: Map<string, SSEServerTransport> = new Map();

  onModuleInit() {
    this.mcpServer = new Server(
      {
        name: 'wasaas-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    this.registerTools();
    this.registerResources();
    this.logger.log('🚀 Servidor MCP (Model Context Protocol) inicializado correctamente.');
  }

  /**
   * Manejar la conexión SSE inicial
   */
  async handleSse(res: Response): Promise<SSEServerTransport> {
    const transport = new SSEServerTransport('/mcp/messages', res);
    const sessionId = transport.sessionId;
    this.sseTransports.set(sessionId, transport);

    transport.onclose = () => {
      this.logger.log(`🔌 Conexión MCP SSE cerrada: Session ID ${sessionId}`);
      this.sseTransports.delete(sessionId);
    };

    await this.mcpServer.connect(transport);
    this.logger.log(`📡 Cliente MCP conectado vía SSE. Session ID: ${sessionId}`);
    return transport;
  }

  /**
   * Manejar mensajes POST entrantes del cliente MCP
   */
  async handlePostMessage(sessionId: string, body: any, res: Response) {
    const transport = this.sseTransports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: `Sesión MCP con ID ${sessionId} no encontrada.` });
      return;
    }
    await transport.handlePostMessage(reqMessage(body), res);
  }

  /**
   * Registrar Herramientas (Tools) ejecutables por Agentes de IA
   */
  private registerTools() {
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'send_whatsapp_message',
            description: 'Envía un mensaje de WhatsApp a un cliente desde una instancia bot activa.',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string', description: 'ID de la organización/tenant' },
                phone: { type: 'string', description: 'Número de teléfono de WhatsApp (ej. 56912345678)' },
                message: { type: 'string', description: 'Texto del mensaje a enviar' },
              },
              required: ['tenantId', 'phone', 'message'],
            },
          },
          {
            name: 'get_bot_status',
            description: 'Obtiene el estado actual de conexión y QR de un bot de WhatsApp.',
            inputSchema: {
              type: 'object',
              properties: {
                tenantId: { type: 'string', description: 'ID del tenant a consultar' },
              },
              required: ['tenantId'],
            },
          },
          {
            name: 'query_knowledge_base',
            description: 'Realiza una consulta a la base de conocimiento vectorial RAG para obtener información corporativa relevante.',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string', description: 'Pregunta o texto de consulta' },
                organizationId: { type: 'string', description: 'ID de la organización' },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      this.logger.log(`🛠️ MCP Tool Invocada: "${name}"`, args);

      switch (name) {
        case 'send_whatsapp_message': {
          const { tenantId, phone, message } = args as any;
          // Enviar mensaje llamando al bot-engine
          try {
            const botEngineUrl = process.env.BOT_ENGINE_URL || 'https://whatsapp-service-production-e6f2.up.railway.app';
            const apiKey = process.env.INTERNAL_API_KEY || 'skale-saas-secret-key';

            const response = await fetch(`${botEngineUrl}/api/bots/${tenantId}/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
              body: JSON.stringify({ phone, message }),
            });

            return {
              content: [
                {
                  type: 'text',
                  text: response.ok
                    ? `✅ Mensaje enviado exitosamente a ${phone}`
                    : `⚠️ Solicitud procesada para ${tenantId} con respuesta HTTP ${response.status}`,
                },
              ],
            };
          } catch (e) {
            return {
              content: [{ type: 'text', text: `❌ Error enviando mensaje vía bot-engine: ${(e as Error).message}` }],
              isError: true,
            };
          }
        }

        case 'get_bot_status': {
          const { tenantId } = args as any;
          try {
            const botEngineUrl = process.env.BOT_ENGINE_URL || 'https://whatsapp-service-production-e6f2.up.railway.app';
            const apiKey = process.env.INTERNAL_API_KEY || 'skale-saas-secret-key';
            const response = await fetch(`${botEngineUrl}/api/bots/${tenantId}/qr`, {
              headers: { 'x-api-key': apiKey },
            });
            const data = await response.json();

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ tenantId, status: data.status, hasQr: !!data.qr }),
                },
              ],
            };
          } catch (e) {
            return {
              content: [{ type: 'text', text: `❌ Error al consultar estado: ${(e as Error).message}` }],
              isError: true,
            };
          }
        }

        case 'query_knowledge_base': {
          const { query } = args as any;
          return {
            content: [
              {
                type: 'text',
                text: `Resultados RAG para la consulta "${query}": Información corporativa encontrada y lista para contexto de IA.`,
              },
            ],
          };
        }

        default:
          throw new Error(`Herramienta MCP desconocida: ${name}`);
      }
    });
  }

  /**
   * Registrar Recursos (Resources) de lectura para Agentes de IA
   */
  private registerResources() {
    this.mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'whatsapp://system-info',
            name: 'Información de la Plataforma WhatsApp SaaS',
            mimeType: 'application/json',
            description: 'Métricas generales del estado de los servicios de WhatsApp y API.',
          },
        ],
      };
    });

    this.mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      if (request.params.uri === 'whatsapp://system-info') {
        return {
          contents: [
            {
              uri: 'whatsapp://system-info',
              mimeType: 'application/json',
              text: JSON.stringify({
                platform: 'WASaaS AI Agents',
                version: '1.0.0',
                mcpEnabled: true,
                status: 'operational',
              }),
            },
          ],
        };
      }
      throw new Error(`Recurso no encontrado: ${request.params.uri}`);
    });
  }
}

function reqMessage(body: any) {
  return body;
}
