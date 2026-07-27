import { Controller, Get, Post, Res, Query, Body, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  /**
   * Endpoint SSE para iniciar una sesión con el Servidor MCP
   */
  @Get('sse')
  async handleSse(@Res() res: Response) {
    return this.mcpService.handleSse(res);
  }

  /**
   * Endpoint de recepción de mensajes RPC desde el cliente MCP
   */
  @Post('messages')
  async handlePostMessage(
    @Query('sessionId') sessionId: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    return this.mcpService.handlePostMessage(sessionId, body, res);
  }
}
