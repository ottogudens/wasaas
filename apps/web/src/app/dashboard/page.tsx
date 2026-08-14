'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Bot, QrCode, Sparkles, CreditCard, Shield, CheckCircle2, FileText, Send, Phone,
  RefreshCw, Loader2, Settings2, AlertTriangle, Terminal, LogOut, Plus, Trash2, User, Building, MessageSquare, Pencil, X, Wifi, WifiOff,
  Cpu, Key, Sliders, Check, Eye, EyeOff, Upload, FileCheck, Download, Smartphone, Menu, Share2, Copy, HelpCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { MiBotLogo } from '../../components/MiBotLogo';
import { InteractiveHelpModal } from '../../components/InteractiveHelpModal';
import { BotsPanel } from '../../components/dashboard/BotsPanel';
import { KnowledgeBasePanel } from '../../components/dashboard/KnowledgeBasePanel';
import { BillingPanel } from '../../components/dashboard/BillingPanel';
import { LiveChatPanel } from '../../components/dashboard/LiveChatPanel';

const DEFAULT_TEMPLATES = [
  {
    id: 'informe-tecnico',
    title: '📋 Informe de Atención y Diagnóstico Técnico',
    category: 'informe',
    fields: [
      { key: 'cliente', label: 'Nombre del Cliente', placeholder: 'Ej. Juan Pérez' },
      { key: 'equipo', label: 'Equipo / Dispositivo', placeholder: 'Ej. Servidor Dell PowerEdge / Laptop HP' },
      { key: 'diagnostico', label: 'Diagnóstico Encontrado', placeholder: 'Ej. Falla en módulo RAM / Error de software' },
      { key: 'solucion', label: 'Solución Aplicada / Recomendada', placeholder: 'Ej. Reemplazo de módulo DDR4 16GB' },
      { key: 'costo', label: 'Costo Total Estimado', placeholder: 'Ej. $85.000 CLP' },
    ],
    templateContent: (data: any) => `📋 *INFORME TÉCNICO DE ATENCIÓN*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Cliente:* ${data.cliente || '[Nombre Cliente]'}
💻 *Dispositivo/Equipo:* ${data.equipo || '[Equipo]'}
📅 *Fecha:* ${new Date().toLocaleDateString('es-CL')}

🔍 *DIAGNÓSTICO TÉCNICO:*
${data.diagnostico || 'Evaluación técnica completada sin anomalías críticas.'}

🛠️ *SOLUCIÓN APLICADA:*
${data.solucion || 'Mantenimiento preventivo y actualización de sistema.'}

💰 *COSTO ESTIMADO:* ${data.costo || '$0'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
_Generado por miBot AI - Skale Software_`
  },
  {
    id: 'formulario-registro',
    title: '📝 Formulario de Registro de Cliente',
    category: 'formulario',
    fields: [
      { key: 'nombre', label: 'Nombre Completo', placeholder: 'Ej. María González' },
      { key: 'rut', label: 'RUT / Identificación', placeholder: 'Ej. 12.345.678-9' },
      { key: 'email', label: 'Correo Electrónico', placeholder: 'Ej. maria@empresa.cl' },
      { key: 'telefono', label: 'Teléfono de Contacto', placeholder: 'Ej. +56912345678' },
      { key: 'servicio', label: 'Servicio / Plan Solicitado', placeholder: 'Ej. Plan Pro Agente IA WhatsApp' },
    ],
    templateContent: (data: any) => `📝 *FORMULARIO DE REGISTRO DE CLIENTE*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Nombre:* ${data.nombre || '[Nombre]'}
🆔 *RUT/ID:* ${data.rut || '[RUT]'}
📧 *Email:* ${data.email || '[Email]'}
📞 *Teléfono:* ${data.telefono || '[Teléfono]'}
🚀 *Plan Solicitado:* ${data.servicio || '[Servicio]'}
📅 *Fecha de Registro:* ${new Date().toLocaleDateString('es-CL')}
━━━━━━━━━━━━━━━━━━━━━━━━━━
_Confirmación de Registro miBot_`
  },
  {
    id: 'resumen-cotizacion',
    title: '📊 Resumen de Cotización Comercial',
    category: 'resumen',
    fields: [
      { key: 'empresa', label: 'Empresa / Cliente', placeholder: 'Ej. Innovación SpA' },
      { key: 'producto', label: 'Producto / Servicio', placeholder: 'Ej. Desarrollo Bot WhatsApp IA' },
      { key: 'cantidad', label: 'Cantidad / Licencias', placeholder: 'Ej. 1 Año Suscripción' },
      { key: 'total', label: 'Monto Total + IVA', placeholder: 'Ej. $350.000 CLP' },
    ],
    templateContent: (data: any) => `📊 *RESUMEN DE COTIZACIÓN COMERCIAL*
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 *Empresa:* ${data.empresa || '[Empresa]'}
📦 *Ítem:* ${data.producto || '[Producto]'}
🔢 *Cantidad:* ${data.cantidad || '1'}
💰 *Monto Total:* ${data.total || '$0 CLP'}
📅 *Validez:* 15 días desde ${new Date().toLocaleDateString('es-CL')}
━━━━━━━━━━━━━━━━━━━━━━━━━━
_Cotización generada automáticamente por miBot_`
  }
];

const AVAILABLE_MODELS: Record<string, Array<{ id: string; name: string; description: string; speed: string; intelligence: string; recommended?: boolean }>> = {
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o-mini', description: 'Ultrarrápido y altamente eficiente. Recomendado para atención al cliente y respuestas ágiles.', speed: '⚡⚡⚡ Muy Alta', intelligence: '🧠🧠 Alta', recommended: true },
    { id: 'gpt-4o', name: 'GPT-4o Omnimodal', description: 'Capacidad cognitiva superior, razonamiento complejo y soporte de visión.', speed: '⚡⚡ Alta', intelligence: '🧠🧠🧠 Superior' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Excelente seguimiento de instrucciones complejas y estructuradas.', speed: '⚡ Media', intelligence: '🧠🧠🧠 Superior' },
    { id: 'o3-mini', name: 'OpenAI o3-mini', description: 'Razonamiento lógico intensivo para soporte técnico y tareas analíticas.', speed: '⚡⚡ Alta', intelligence: '🧠🧠🧠 Razonador' },
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Redacción humana natural fluida, código y análisis conceptual fino.', speed: '⚡⚡ Alta', intelligence: '🧠🧠🧠 Superior', recommended: true },
    { id: 'claude-3-5-haiku', name: 'Claude 3.5 Haiku', description: 'Baja latencia con respuestas ágiles para interacciones directas.', speed: '⚡⚡⚡ Muy Alta', intelligence: '🧠🧠 Media-Alta' },
  ],
  google: [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Modelo ligero optimizado para velocidad extrema y gran volumen de chats.', speed: '⚡⚡⚡ Máxima', intelligence: '🧠🧠 Alta', recommended: true },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Ventana de contexto extendida ideal para catálogos extensos.', speed: '⚡ Media', intelligence: '🧠🧠🧠 Superior' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Siguiente generación de Google con razonamiento rápido en tiempo real.', speed: '⚡⚡⚡ Máxima', intelligence: '🧠🧠🧠 Alta' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek-V3 Chat', description: 'Modelo ultra eficiente con respuestas precisas a un costo mínimo.', speed: '⚡⚡⚡ Muy Alta', intelligence: '🧠🧠 Alta', recommended: true },
    { id: 'deepseek-r1', name: 'DeepSeek-R1', description: 'Especializado en cadena de pensamiento y lógica profunda.', speed: '⚡ Media', intelligence: '🧠🧠🧠 Razonador' },
  ],
};

export default function DashboardPage() {
  const { user, org, token, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'qr' | 'prompt' | 'ai-config' | 'templates' | 'rag' | 'billing' | 'bots' | 'chat' | 'tenants-admin'>('bots');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // Chat state
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI Config state
  const [aiProvider, setAiProvider] = useState<'openai' | 'anthropic' | 'google' | 'deepseek'>('openai');
  const [customApiKey, setCustomApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(800);
  const [aiSaveMessage, setAiSaveMessage] = useState<string | null>(null);

  // AI Playground test state
  const [testInput, setTestInput] = useState('');
  const [testMessages, setTestMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [testingAi, setTestingAi] = useState(false);

  // Templates state
  const [selectedTemplateId, setSelectedTemplateId] = useState(DEFAULT_TEMPLATES[0].id);
  const [templateFormData, setTemplateFormData] = useState<Record<string, string>>({});
  const [targetPhoneForDoc, setTargetPhoneForDoc] = useState('');
  const [sendingDoc, setSendingDoc] = useState(false);
  const [docSendStatus, setDocSendStatus] = useState<string | null>(null);

  // RAG File Upload state
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [uploadFileSize, setUploadFileSize] = useState<string | null>(null);

  // Bot instances state
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBot, setSelectedBot] = useState<any | null>(null);
  const [newBotName, setNewBotName] = useState('');
  const [loadingBots, setLoadingBots] = useState(false);
  const [creatingBot, setCreatingBot] = useState(false);

  // Edit bot state
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [editBotName, setEditBotName] = useState('');
  const [deletingBotId, setDeletingBotId] = useState<string | null>(null);

  // QR & Bot connection state
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [botStatus, setBotStatus] = useState<'DISCONNECTED' | 'GENERATING' | 'CONNECTED' | 'QR_READY' | 'CONNECTING' | 'ERROR'>('DISCONNECTED');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Phone pairing state
  const [pairingMode, setPairingMode] = useState<'qr' | 'phone'>('qr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [requestingPairing, setRequestingPairing] = useState(false);

  // Prompt state
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [aiModel, setAiModel] = useState<string>('gpt-4o-mini');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [promptMessage, setPromptMessage] = useState<string | null>(null);

  // RAG state
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [processingRag, setProcessingRag] = useState(false);
  const [ragStatus, setRagStatus] = useState<string | null>(null);

  // Tenants Admin state (SUPER_ADMIN)
  const [tenantsList, setTenantsList] = useState<any[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState<any | null>(null);
  const [tenantAiModel, setTenantAiModel] = useState<string>('gpt-4o-mini');
  const [tenantPrompt, setTenantPrompt] = useState<string>('');
  const [savingTenantAi, setSavingTenantAi] = useState(false);
  const [tenantSaveStatus, setTenantSaveStatus] = useState<string | null>(null);

  // Sales Plans & Invoicing state (SUPER_ADMIN)
  const [salesPlans, setSalesPlans] = useState<any[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', description: '', price: 29, maxBots: 1, maxDocs: 50 });
  const [invoiceModalTenant, setInvoiceModalTenant] = useState<any | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({ amount: 0, description: '', phone: '' });
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [invoiceStatusMsg, setInvoiceStatusMsg] = useState<string | null>(null);

  // Endpoint config
  const [botEngineUrl, setBotEngineUrl] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 19)]);
  }, []);

  // Protect route
  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  // Load bots and documents
  const loadBots = useCallback(async () => {
    if (!token) return;
    setLoadingBots(true);
    try {
      const data = await api.listBots();
      setBots(data);
      if (data.length > 0 && !selectedBot) {
        const first = data[0];
        setSelectedBot(first);
        setSystemPrompt(first.systemPrompt || '');
        setAiModel(first.aiModel || 'gpt-4o-mini');
        setBotStatus(first.status || 'DISCONNECTED');
      }
      // Also update the selected bot's status if it still exists
      if (selectedBot) {
        const updated = data.find((b: any) => b.id === selectedBot.id);
        if (updated) {
          setBotStatus(updated.status || 'DISCONNECTED');
        }
      }
    } catch (err: any) {
      addLog(`❌ Error al cargar bots: ${err.message}`);
    } finally {
      setLoadingBots(false);
    }
  }, [token, selectedBot, addLog]);

  const loadDocuments = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.listDocuments();
      setDocuments(res.documents || []);
    } catch (err: any) {
      addLog(`❌ Error al cargar documentos RAG: ${err.message}`);
    }
  }, [token, addLog]);

  const loadTenants = useCallback(async () => {
    if (!token || user?.role !== 'SUPER_ADMIN') return;
    setLoadingTenants(true);
    try {
      const data = await api.listTenants();
      setTenantsList(data);
    } catch (err: any) {
      addLog(`❌ Error cargando lista de tenants: ${err.message}`);
    } finally {
      setLoadingTenants(false);
    }
  }, [token, user, addLog]);

  const loadSalesPlans = useCallback(async () => {
    if (!token || user?.role !== 'SUPER_ADMIN') return;
    try {
      const data = await api.listSalesPlans();
      setSalesPlans(data);
    } catch (err: any) {
      addLog(`❌ Error cargando planes de venta: ${err.message}`);
    }
  }, [token, user, addLog]);

  useEffect(() => {
    if (token) {
      loadBots();
      loadDocuments();
      if (user?.role === 'SUPER_ADMIN') {
        loadTenants();
        loadSalesPlans();
      }
    }
  }, [token, user, loadBots, loadDocuments, loadTenants, loadSalesPlans]);

  // Poll bot status every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      if (token) loadBots();
    }, 10000);
    return () => clearInterval(interval);
  }, [token, loadBots]);

  // Detect endpoints
  useEffect(() => {
    let apiHost = process.env.NEXT_PUBLIC_BOT_ENGINE_URL;
    let websocketUrl = process.env.NEXT_PUBLIC_WS_URL;

    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

      if (!apiHost) {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          apiHost = 'http://localhost:3005';
        } else {
          apiHost = `${protocol}//whatsapp-service-production-e6f2.up.railway.app`;
        }
      }

      if (!websocketUrl) {
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          websocketUrl = 'ws://localhost:3005';
        } else {
          websocketUrl = `${wsProtocol}//whatsapp-service-production-e6f2.up.railway.app`;
        }
      }
    }

    setBotEngineUrl(apiHost || '');
    setWsUrl(websocketUrl || '');
  }, []);

  // Request QR Code from bot-engine
  const handleRequestQr = useCallback(async (overrideUrl?: string) => {
    if (!selectedBot) return;
    setBotStatus('GENERATING');
    setErrorMessage(null);
    setPairingCode(null);
    const targetUrl = overrideUrl || botEngineUrl || 'https://whatsapp-service-production-e6f2.up.railway.app';
    const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'skale-saas-secret-key';

    addLog(`Iniciando bot "${selectedBot.name}" (Tenant: ${selectedBot.tenantId})...`);

    try {
      // Limpiar instancia previa si ya existía para evitar 409 y forzar QR nuevo
      await fetch(`${targetUrl}/internal/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ tenantId: selectedBot.tenantId }),
      }).catch(() => {});

      const res = await fetch(`${targetUrl}/internal/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          tenantId: selectedBot.tenantId,
          name: selectedBot.name,
          flowIds: ['default_ai_flow'],
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        setErrorMessage(`Error HTTP ${res.status}: ${errorText}`);
        addLog(`❌ Error HTTP en bot-engine: ${res.status}`);
        setBotStatus('DISCONNECTED');
      } else {
        addLog(`✅ Instancia solicitada. Esperando QR...`);
      }
    } catch (error: any) {
      setErrorMessage(`Error de red con Bot Engine: ${error.message}`);
      addLog(`❌ Excepción de red: ${error.message}`);
      setBotStatus('DISCONNECTED');
    }
  }, [selectedBot, botEngineUrl, addLog]);

  // Phone pairing
  const handleRequestPairingCode = async () => {
    if (!selectedBot || !phoneNumber.trim()) return;
    setRequestingPairing(true);
    setPairingCode(null);
    setErrorMessage(null);
    const targetUrl = botEngineUrl || 'https://whatsapp-service-production-e6f2.up.railway.app';
    const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'skale-saas-secret-key';

    addLog(`📱 Solicitando código de vinculación para ${phoneNumber}...`);

    try {
      // Limpiar instancia previa si ya existía para generar pairing code limpio
      await fetch(`${targetUrl}/internal/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ tenantId: selectedBot.tenantId }),
      }).catch(() => {});

      // Request pairing code directly
      const res = await fetch(`${targetUrl}/internal/pair-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          tenantId: selectedBot.tenantId,
          phoneNumber: phoneNumber.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.code) {
          setPairingCode(data.code);
          addLog(`✅ Código de vinculación recibido: ${data.code}`);
        } else {
          addLog(`⏳ Solicitud enviada. Esperando código por WebSocket...`);
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
        setErrorMessage(errorData.error || `Error HTTP ${res.status}`);
        addLog(`❌ Error: ${errorData.error}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      addLog(`❌ Error: ${err.message}`);
    } finally {
      setRequestingPairing(false);
    }
  };

  const handleDisconnectBot = async () => {
    if (!selectedBot) return;
    try {
      const targetUrl = botEngineUrl || 'https://whatsapp-service-production-e6f2.up.railway.app';
      const apiKey = process.env.NEXT_PUBLIC_INTERNAL_API_KEY || 'skale-saas-secret-key';

      // Actualizar UI optimistamente
      setBotStatus('DISCONNECTED');
      setQrCodeData(null);
      setPairingCode(null);

      await fetch(`${targetUrl}/internal/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ tenantId: selectedBot.tenantId }),
      }).catch(() => {});

      addLog(`✅ Agente desconectado exitosamente.`);
      await loadBots();
    } catch (err: any) {
      addLog(`❌ Error al desconectar: ${err.message}`);
    }
  };

  // WebSocket listener for QR
  useEffect(() => {
    if (!wsUrl || !selectedBot) return;

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        addLog(`📡 Canal WebSocket activo con bot-engine`);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.tenantId && data.tenantId !== selectedBot.tenantId) return;

          if (data.event === 'bot:qr') {
            setQrCodeData(data.qr);
            setBotStatus('QR_READY');
            setErrorMessage(null);
            addLog(`⚡ Código QR recibido para ${selectedBot.name}`);
          } else if (data.event === 'bot:code') {
            setPairingCode(data.code);
            setRequestingPairing(false);
            setErrorMessage(null);
            addLog(`📱 Código de vinculación recibido: ${data.code}`);
          } else if (data.event === 'bot:connected') {
            setBotStatus('CONNECTED');
            setQrCodeData(null);
            setPairingCode(null);
            setErrorMessage(null);
            addLog(`🎉 Bot "${selectedBot.name}" conectado a WhatsApp.`);
            loadBots(); // Refresh DB status
          } else if (data.event === 'bot:disconnected') {
            setBotStatus('DISCONNECTED');
            setQrCodeData(null);
            addLog(`⚠️ Bot "${selectedBot.name}" desconectado.`);
            loadBots();
          } else if (data.event === 'bot:message') {
            // Un mensaje nuevo acaba de llegar, recargamos la lista de conversaciones y mensajes
            if (activeTab === 'chat') {
              loadConversations();
              loadMessages();
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
    } catch (e: any) {
      console.error(e);
    }

    return () => {
      if (socket) socket.close();
    };
  }, [wsUrl, selectedBot, addLog]);

  // Chat methods
  const loadConversations = useCallback(async () => {
    if (!selectedBot || activeTab !== 'chat') return;
    try {
      const data = await api.listConversations(selectedBot.id);
      setConversations(data);
    } catch (err) {
      console.error(err);
    }
  }, [selectedBot, activeTab]);

  const loadMessages = useCallback(async () => {
    if (!selectedConversationId) return;
    try {
      const data = await api.getMessages(selectedConversationId);
      setMessages(data);
    } catch (err) {
      console.error(err);
    }
  }, [selectedConversationId]);

  // Polling chat
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Chat scroll container ref
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedConversationId) return;
    const msg = chatInput.trim();
    setChatInput('');
    try {
      setMessages(prev => [...prev, { content: msg, sender: 'AGENT', createdAt: new Date().toISOString() }]);
      await api.sendManualMessage(selectedConversationId, msg);
      await loadMessages();
      await loadConversations();
    } catch (err: any) {
      addLog(`❌ Error enviando mensaje: ${err.message}`);
    }
  };

  const handleToggleHumanMode = async () => {
    if (!selectedConversationId) return;
    const currentConv = conversations.find(c => c.id === selectedConversationId);
    const newMode = !currentConv?.isHumanMode;

    // Optimistic UI update
    setConversations(prev => prev.map(c => c.id === selectedConversationId ? { ...c, isHumanMode: newMode } : c));

    try {
      await api.toggleHumanMode(selectedConversationId, newMode);
      addLog(`👤 Modo Agente Humano ${newMode ? 'ACTIVADO (IA pausada)' : 'DESACTIVADO (IA activa)'} para ${currentConv?.customerPhone}`);
      await loadConversations();
    } catch (err: any) {
      addLog(`❌ Error al cambiar modo humano: ${err.message}`);
      await loadConversations();
    }
  };

  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBotName.trim()) return;
    setCreatingBot(true);
    try {
      const created = await api.createBot({ name: newBotName });
      setNewBotName('');
      addLog(`🤖 Bot "${created.name}" creado exitosamente.`);
      await loadBots();
      setSelectedBot(created);
      setBotStatus('DISCONNECTED');
    } catch (err: any) {
      addLog(`❌ Error al crear bot: ${err.message}`);
    } finally {
      setCreatingBot(false);
    }
  };

  const handleEditBot = async (botId: string) => {
    if (!editBotName.trim()) return;
    try {
      await api.updateBot(botId, { name: editBotName });
      setEditingBotId(null);
      setEditBotName('');
      addLog(`✏️ Bot renombrado exitosamente.`);
      await loadBots();
    } catch (err: any) {
      addLog(`❌ Error al editar: ${err.message}`);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    try {
      // Remover de la UI de inmediato para respuesta instantánea
      setBots(prev => prev.filter(b => b.id !== botId));
      setDeletingBotId(null);
      if (selectedBot?.id === botId) {
        setSelectedBot(null);
        setBotStatus('DISCONNECTED');
      }

      await api.deleteBot(botId);
      addLog(`🗑️ Bot eliminado exitosamente.`);
      await loadBots();
    } catch (err: any) {
      addLog(`❌ Error al eliminar: ${err.message}`);
      await loadBots();
    }
  };

  const handleSavePrompt = async () => {
    if (!selectedBot) return;
    setSavingPrompt(true);
    setPromptMessage(null);
    try {
      const updated = await api.updateBot(selectedBot.id, {
        systemPrompt,
        aiModel,
      });
      setSelectedBot(updated);
      setPromptMessage('✅ Configuración guardada en la base de datos');
      addLog(`💾 System prompt actualizado para bot "${selectedBot.name}"`);
    } catch (err: any) {
      setPromptMessage(`❌ Error: ${err.message}`);
    } finally {
      setSavingPrompt(false);
    }
  };

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  // Handler for File Upload to Knowledge Base (RAG)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeKb = (file.size / 1024).toFixed(1);
    setUploadFileName(file.name);
    setUploadFileSize(`${sizeKb} KB`);
    setDocumentTitle(file.name.replace(/\.[^/.]+$/, "")); // Strip extension for title

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setDocumentContent(text);
        addLog(`📂 Archivo "${file.name}" cargado (${sizeKb} KB). Listo para almacenamiento en pgvector.`);
      }
    };
    reader.readAsText(file);
  };

  // Handler for Sending Generated Document via WhatsApp
  const handleSendGeneratedDoc = async () => {
    if (!selectedBot) {
      setDocSendStatus('⚠️ Selecciona o crea un agente activo primero.');
      return;
    }
    if (!targetPhoneForDoc.trim()) {
      setDocSendStatus('⚠️ Ingresa el número de teléfono del cliente (ej. 56984205124).');
      return;
    }

    const currentTpl = DEFAULT_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (!currentTpl) return;

    const docContent = currentTpl.templateContent(templateFormData);
    setSendingDoc(true);
    setDocSendStatus('Enviando documento formateado por WhatsApp...');

    try {
      const res = await api.sendGeneratedDocument(
        selectedBot.id,
        targetPhoneForDoc.trim(),
        currentTpl.title,
        docContent
      );
      if (res.success || res.message) {
        setDocSendStatus(`✅ Documento "${currentTpl.title}" enviado exitosamente a ${targetPhoneForDoc}`);
        addLog(`📄 Documento enviado por WhatsApp a ${targetPhoneForDoc}`);
      } else {
        setDocSendStatus(`❌ Error al enviar documento: ${res.error || 'Respuesta fallida'}`);
      }
    } catch (err: any) {
      setDocSendStatus(`❌ Error: ${err.message}`);
    } finally {
      setSendingDoc(false);
    }
  };

  const handleSaveAiConfig = async () => {
    if (!selectedBot) return;
    setSavingPrompt(true);
    setAiSaveMessage(null);
    try {
      const updated = await api.updateBot(selectedBot.id, {
        systemPrompt,
        aiModel,
      });
      setSelectedBot(updated);
      setAiSaveMessage('✅ Configuración de IA guardada exitosamente');
      addLog(`💾 Configuración de IA actualizada para bot "${selectedBot.name}" (Modelo: ${aiModel})`);
    } catch (err: any) {
      setAiSaveMessage(`❌ Error: ${err.message}`);
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleRunAiTest = async () => {
    if (!testInput.trim()) return;
    const userMsg = testInput.trim();
    setTestInput('');
    setTestMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setTestingAi(true);

    try {
      const res = await api.chatAi(userMsg, systemPrompt || 'Eres miBot, un asistente inteligente de atención al cliente.');
      setTestMessages((prev) => [...prev, { role: 'assistant', content: res.reply || 'Sin respuesta' }]);
    } catch (err: any) {
      setTestMessages((prev) => [...prev, { role: 'assistant', content: `❌ Error al probar modelo ${aiModel}: ${err.message}` }]);
    } finally {
      setTestingAi(false);
    }
  };

  const handleProcessRag = async () => {
    if (!documentTitle || !documentContent) return;
    setProcessingRag(true);
    setRagStatus('Procesando y generando embeddings vectoriales...');
    try {
      const res = await api.processDocument({ title: documentTitle, content: documentContent });
      setRagStatus(`✅ Documento procesado: ${res.totalChunksProcessed} vectores almacenados en pgvector`);
      setDocumentTitle('');
      setDocumentContent('');
      await loadDocuments();
    } catch (err: any) {
      setRagStatus(`❌ Error: ${err.message}`);
    } finally {
      setProcessingRag(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      await api.deleteDocument(id);
      await loadDocuments();
      addLog(`🗑️ Documento RAG eliminado`);
    } catch (err: any) {
      addLog(`❌ Error eliminando documento: ${err.message}`);
    }
  };

  const handleSubscribe = async (planName: string, amount: number) => {
    try {
      const res = await api.createSubscription({ planName, amount });
      if (res.initPoint) {
        window.location.href = res.initPoint;
      }
    } catch (err: any) {
      addLog(`❌ Error iniciando suscripción: ${err.message}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return { className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', label: '● Conectado', icon: <Wifi className="w-3 h-3" /> };
      case 'QR_READY':
        return { className: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: '◌ QR Listo', icon: <QrCode className="w-3 h-3" /> };
      case 'CONNECTING':
      case 'GENERATING':
        return { className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: '◎ Vinculando...', icon: <Loader2 className="w-3 h-3 animate-spin" /> };
      case 'ERROR':
        return { className: 'bg-red-500/20 text-red-400 border-red-500/30', label: '✕ Error', icon: <AlertTriangle className="w-3 h-3" /> };
      default:
        return { className: 'bg-slate-700/50 text-slate-400 border-slate-600/30', label: '○ Desconectado', icon: <WifiOff className="w-3 h-3" /> };
    }
  };

  if (authLoading || !user || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <MiBotLogo className="w-8 h-8" textClassName="text-lg" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsHelpOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Ayuda
          </button>
          {isInstallable && (
            <button
              onClick={handleInstallPwa}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Smartphone className="w-3.5 h-3.5" /> Instalar
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-900/95 backdrop-blur-xl p-6 flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          <div className="flex items-center gap-3 mb-8">
            <MiBotLogo className="w-9 h-9" textClassName="text-xl" />
          </div>

          {/* Org & User card */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 mb-6 space-y-1">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
              <Building className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">{org.name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <User className="w-3 h-3 text-slate-500" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>

          {isInstallable && (
            <button
              onClick={handleInstallPwa}
              className="w-full mb-4 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" /> Instalar miBot App
            </button>
          )}

          <nav className="space-y-2">
            <button
              onClick={() => { setActiveTab('bots'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'bots'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Bot className="w-4 h-4" /> Mis Agentes ({bots.length})
            </button>
            <button
              onClick={() => { setActiveTab('qr'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'qr'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <QrCode className="w-4 h-4" /> Vincular WhatsApp
            </button>
            <button
              onClick={() => { setActiveTab('chat'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Chat en Vivo
            </button>
            <button
              onClick={() => { setActiveTab('prompt'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'prompt'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" /> Prompt y Personalidad
            </button>
            {/* Configuración de IA exclusiva para SUPER_ADMIN */}
            {user?.role === 'SUPER_ADMIN' && (
              <>
                <button
                  onClick={() => { setActiveTab('tenants-admin'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'tenants-admin'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                      : 'text-purple-300/80 hover:bg-slate-800/50 hover:text-purple-300'
                  }`}
                >
                  <Shield className="w-4 h-4 text-purple-400" /> Administración Tenants
                </button>
                <button
                  onClick={() => { setActiveTab('ai-config'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'ai-config'
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <Cpu className="w-4 h-4" /> Configuración de IA
                </button>
              </>
            )}
            <button
              onClick={() => { setActiveTab('templates'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'templates'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <FileCheck className="w-4 h-4" /> Plantillas e Informes
            </button>
            <button
              onClick={() => { setActiveTab('rag'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'rag'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" /> Base de Conocimiento (RAG)
            </button>
            <button
              onClick={() => { setActiveTab('billing'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'billing'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Planes y Suscripción
            </button>
          </nav>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setIsHelpOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 transition-all shadow-md"
          >
            <HelpCircle className="w-4 h-4" /> Guía Interactiva
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-red-400 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-10 overflow-y-auto">
        {/* Banner de Selección Global de Agente para Super Admin */}
        {bots.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-900/80 border border-purple-500/30 flex items-center justify-between flex-wrap gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-300">
                  {user?.role === 'SUPER_ADMIN' ? '👑 Modo Super Admin — Agente Activo Global' : 'Agente Activo Seleccionado'}
                </p>
                <p className="text-sm font-bold text-slate-100">
                  {selectedBot ? `${selectedBot.name} (${selectedBot.tenantId})` : 'Ningún agente seleccionado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium">Cambiar Agente:</label>
              <select
                value={selectedBot?.id || ''}
                onChange={(e) => {
                  const b = bots.find((item) => item.id === e.target.value);
                  if (b) {
                    setSelectedBot(b);
                    setSystemPrompt(b.systemPrompt || '');
                    setAiModel(b.aiModel || 'gpt-4o-mini');
                    setBotStatus(b.status || 'DISCONNECTED');
                  }
                }}
                className="p-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {bots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.tenantId}) — {b.status || 'DISCONNECTED'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Bots Tab */}
        {activeTab === 'bots' && (
          <BotsPanel 
            onSelectBot={(b) => {
              setSelectedBot(b);
              setSystemPrompt(b.systemPrompt || '');
              setAiModel(b.aiModel || 'gpt-4o-mini');
              setBotStatus(b.status || 'DISCONNECTED');
              setActiveTab('qr');
            }}
          />
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <LiveChatPanel selectedBotId={selectedBot?.id || null} />
        )}

        {/* QR Tab */}
        {activeTab === 'qr' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Vincular WhatsApp</h2>
              <p className="text-slate-400 text-sm">
                {selectedBot ? `Vincular agente "${selectedBot.name}"` : 'Selecciona o crea un agente para vincular.'}
              </p>
            </div>

            {/* Connection status banner */}
            {selectedBot && (
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                botStatus === 'CONNECTED' 
                  ? 'bg-emerald-500/5 border-emerald-500/20' 
                  : 'bg-slate-900/40 border-slate-800'
              }`}>
                <div className="flex items-center gap-3">
                  {(() => {
                    const badge = getStatusBadge(botStatus);
                    return (
                      <>
                        <div className={`p-2 rounded-lg ${badge.className}`}>{badge.icon}</div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">Estado: {badge.label}</p>
                          <p className="text-xs text-slate-400">{selectedBot.name} • {selectedBot.tenantId}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                {botStatus === 'CONNECTED' && (
                  <button
                    onClick={handleDisconnectBot}
                    className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all flex items-center gap-2 text-sm font-medium"
                  >
                    <LogOut className="w-4 h-4" /> Desconectar
                  </button>
                )}
              </div>
            )}

            <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center min-h-[380px] shadow-2xl relative overflow-hidden">
              {botStatus === 'CONNECTED' ? (
                <div className="text-center space-y-4">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto animate-bounce" />
                  <h3 className="text-xl font-bold text-slate-100">¡WhatsApp Vinculado!</h3>
                  <p className="text-slate-400 text-sm">Tu agente de IA está activo y respondiendo mensajes en tiempo real.</p>
                  <p className="text-slate-500 text-xs">Si necesitas vincular a otro número, primero desconecta la sesión actual.</p>
                  <button
                    onClick={handleDisconnectBot}
                    className="mt-4 px-5 py-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all flex items-center gap-2 mx-auto text-sm font-medium"
                  >
                    <LogOut className="w-4 h-4" /> Cerrar sesión de WhatsApp
                  </button>
                </div>
              ) : (
                <>
                  {/* Mode toggle */}
                  {selectedBot && (
                    <div className="flex items-center gap-2 mb-6">
                      <button
                        onClick={() => setPairingMode('qr')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          pairingMode === 'qr'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <QrCode className="w-4 h-4" /> Código QR
                      </button>
                      <button
                        onClick={() => setPairingMode('phone')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                          pairingMode === 'phone'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Phone className="w-4 h-4" /> Número de Teléfono
                      </button>
                    </div>
                  )}

                  {pairingMode === 'qr' ? (
                    /* QR mode */
                    qrCodeData ? (
                      <div className="text-center space-y-4">
                        <div className="p-4 bg-white rounded-2xl shadow-xl inline-block relative group">
                          {qrCodeData.startsWith('data:image') ? (
                            <img src={qrCodeData} alt="WhatsApp QR Code" className="w-64 h-64 border border-slate-200 rounded-lg shadow-inner" />
                          ) : (
                            <QRCodeSVG value={qrCodeData} size={256} className="w-64 h-64 border border-slate-200 rounded-lg shadow-inner" />
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                          <span>Escanea desde WhatsApp -&gt; Dispositivos Vinculados</span>
                        </div>
                        <button
                          onClick={() => handleRequestQr()}
                          className="mt-2 text-xs text-slate-400 hover:text-emerald-400 underline transition-colors"
                        >
                          Regenerar Código QR
                        </button>
                      </div>
                    ) : (
                      <div className="text-center space-y-4 w-full max-w-md">
                        <QrCode className="w-16 h-16 text-slate-600 mx-auto opacity-50" />
                        <p className="text-slate-300 text-sm font-medium">
                          {selectedBot ? `Presiona el botón para generar el código QR.` : 'Crea un agente para comenzar.'}
                        </p>

                        {errorMessage && (
                          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 text-left">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold">Error al generar QR</p>
                              <p className="text-[11px] text-red-300/80 mt-0.5">{errorMessage}</p>
                            </div>
                          </div>
                        )}

                        {selectedBot && (
                          <button
                            onClick={() => handleRequestQr()}
                            disabled={botStatus === 'GENERATING'}
                            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold transition-all inline-flex items-center gap-2 disabled:opacity-50"
                          >
                            {botStatus === 'GENERATING' ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                            Generar Código QR
                          </button>
                        )}
                      </div>
                    )
                  ) : (
                    /* Phone pairing mode */
                    <div className="text-center space-y-4 w-full max-w-md">
                      <Phone className="w-16 h-16 text-slate-600 mx-auto opacity-50" />
                      <p className="text-slate-300 text-sm font-medium">
                        Ingresa tu número de teléfono para recibir un código de vinculación.
                      </p>

                      <div className="flex gap-3">
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="Ej: 5491112345678 (sin +)"
                          className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={handleRequestPairingCode}
                          disabled={requestingPairing || !phoneNumber.trim()}
                          className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold transition-all inline-flex items-center gap-2 disabled:opacity-50"
                        >
                          {requestingPairing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Solicitar
                        </button>
                      </div>

                      {pairingCode && (
                        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-sm text-emerald-400 font-medium mb-2">Tu código de vinculación:</p>
                          <p className="text-4xl font-mono font-bold text-white tracking-[0.3em]">{pairingCode}</p>
                          <p className="text-xs text-slate-400 mt-3">
                            Ingresa este código en WhatsApp → Dispositivos Vinculados → Vincular con número de teléfono
                          </p>
                        </div>
                      )}

                      {errorMessage && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 text-left">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">Error</p>
                            <p className="text-[11px] text-red-300/80 mt-0.5">{errorMessage}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Diagnostic Logs */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-900">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-slate-300">Logs en Tiempo Real</span>
                </div>
                <button onClick={() => setLogs([])} className="text-[10px] text-slate-500 hover:text-slate-300">
                  Limpiar
                </button>
              </div>
              <div className="h-32 overflow-y-auto space-y-1 scrollbar-thin">
                {logs.length === 0 ? (
                  <p className="text-slate-600 italic">Esperando eventos...</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className={`text-[11px] ${
                      log.includes('❌') ? 'text-red-400' : log.includes('✅') || log.includes('🎉') ? 'text-emerald-400' : 'text-slate-400'
                    }`}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Prompt Tab */}
        {activeTab === 'prompt' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Prompt y Personalidad del Agente</h2>
              <p className="text-slate-400 text-sm">
                {selectedBot ? `Configurando agente "${selectedBot.name}"` : 'Selecciona un agente primero.'}
              </p>
            </div>

            {selectedBot ? (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                {user?.role === 'SUPER_ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Modelo de IA (Administrador)</label>
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    >
                      <option value="gpt-4o-mini">OpenAI GPT-4o-mini (Rápido y económico)</option>
                      <option value="gpt-4o">OpenAI GPT-4o (Avanzado)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">System Prompt</label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={8}
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-sm"
                    placeholder="Instrucciones específicas para el bot..."
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={handleSavePrompt}
                    disabled={savingPrompt}
                    className="px-6 py-3 rounded-xl bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Guardar Configuración en BD
                  </button>
                  {promptMessage && (
                    <span className={`text-sm font-medium ${promptMessage.includes('❌') ? 'text-red-400' : 'text-emerald-400'}`}>
                      {promptMessage}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Selecciona un agente en el menú de la izquierda.</p>
            )}
          </div>
        )}

        {/* AI Config Tab */}
        {activeTab === 'ai-config' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                <Cpu className="w-7 h-7 text-emerald-400" />
                Configuración y Selección de Motor IA
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Personaliza el proveedor de Inteligencia Artificial, el modelo y los parámetros de respuesta para tus agentes.
              </p>
            </div>

            {/* Target Bot Bar */}
            {selectedBot ? (
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 font-medium">Agente seleccionado</div>
                    <div className="text-slate-100 font-bold text-base flex items-center gap-2">
                      {selectedBot.name}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {selectedBot.tenantId}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Modelo Activo:</span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                    {aiModel}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                ⚠️ Selecciona o crea un agente en la pestaña "Mis Agentes" para aplicar los cambios de IA.
              </div>
            )}

            {/* AI Provider & Model Selector */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">1. Selecciona el Proveedor y Modelo de IA</h3>
              
              {/* Provider Selector Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'openai', name: 'OpenAI', icon: '🤖', badge: 'Popular' },
                  { id: 'anthropic', name: 'Anthropic Claude', icon: '🧠', badge: 'Razonamiento' },
                  { id: 'google', name: 'Google Gemini', icon: '✨', badge: 'Ultra Veloz' },
                  { id: 'deepseek', name: 'DeepSeek', icon: '⚡', badge: 'Económico' },
                ].map((prov) => (
                  <button
                    key={prov.id}
                    onClick={() => {
                      setAiProvider(prov.id as any);
                      const defaultMod = AVAILABLE_MODELS[prov.id][0]?.id;
                      if (defaultMod) setAiModel(defaultMod);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                      aiProvider === prov.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{prov.icon}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {prov.badge}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="font-bold text-slate-100 text-sm">{prov.name}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Model Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {AVAILABLE_MODELS[aiProvider]?.map((model) => (
                  <div
                    key={model.id}
                    onClick={() => setAiModel(model.id)}
                    className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative group ${
                      aiModel === model.id
                        ? 'bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900 border-emerald-500/50 shadow-xl shadow-emerald-500/10'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    {aiModel === model.id && (
                      <div className="absolute top-3 right-3 text-emerald-400 bg-emerald-500/20 p-1 rounded-full border border-emerald-500/40">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-100 text-base">{model.name}</h4>
                        {model.recommended && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{model.description}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Velocidad: <strong className="text-slate-300">{model.speed}</strong></span>
                      <span>Inteligencia: <strong className="text-slate-300">{model.intelligence}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* API Key & Provider Credentials */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  2. Credenciales y Clave de API ({aiProvider.toUpperCase()})
                </h3>
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  API Key miBot Activa
                </span>
              </div>

              <div className="space-y-3">
                <label className="text-xs text-slate-400 font-medium block">
                  Clave de API Personal (Opcional - Si la dejas vacía se usará la API Key oficial asignada por miBot):
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder={`Ej: ${aiProvider === 'openai' ? 'sk-proj-...' : aiProvider === 'anthropic' ? 'sk-ant-...' : 'AIzaSy...'}`}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 font-mono pr-24"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-900 border border-slate-800"
                  >
                    {showApiKey ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  🔒 Tus claves privadas se almacenan de forma totalmente aislada y cifrada.
                </p>
              </div>
            </div>

            {/* Hyperparameters */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-6">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                3. Hiperparámetros del Modelo
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-300">Temperatura (Creatividad):</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>0.0 (Preciso / Soporte)</span>
                    <span>0.5 (Balanceado)</span>
                    <span>1.0 (Creativo)</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-300">Límite de Tokens por Respuesta:</span>
                    <span className="text-emerald-400 font-mono font-bold text-sm">{maxTokens} tokens</span>
                  </div>
                  <input
                    type="number"
                    min="100"
                    max="4000"
                    step="50"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value) || 500)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500">~800 tokens equivale a aproximadamente 600 palabras.</p>
                </div>
              </div>
            </div>

            {/* Live Playground / Tester */}
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                4. Playground: Prueba de Respuesta del Modelo en Tiempo Real
              </h3>
              <p className="text-xs text-slate-400">
                Envía un mensaje de prueba para verificar cómo responderá el modelo <strong className="text-emerald-400">{aiModel}</strong> con tu prompt actual.
              </p>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 max-h-60 overflow-y-auto font-sans">
                {testMessages.length === 0 ? (
                  <div className="text-center py-6 text-slate-600 text-xs italic">
                    Escribe una pregunta abajo para probar el comportamiento de la IA en vivo...
                  </div>
                ) : (
                  testMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/30'
                          : 'bg-slate-900 text-slate-200 border border-slate-800'
                      }`}>
                        <div className="font-bold text-[10px] opacity-60 mb-1">{msg.role === 'user' ? 'Tú (Prueba)' : `miBot (${aiModel})`}</div>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunAiTest()}
                  placeholder="Ej: ¿Cuáles son sus horarios de atención?"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleRunAiTest}
                  disabled={testingAi || !testInput.trim()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {testingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Probar
                </button>
              </div>
            </div>

            {/* Save Action */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {aiSaveMessage && (
                <span className="text-xs font-semibold text-emerald-400">{aiSaveMessage}</span>
              )}
              <button
                onClick={handleSaveAiConfig}
                disabled={savingPrompt || !selectedBot}
                className="ml-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {savingPrompt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Guardar Configuración de IA
              </button>
            </div>
          </div>
        )}

        {/* Templates & Reports Tab */}
        {activeTab === 'templates' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                <FileCheck className="w-7 h-7 text-emerald-400" />
                Plantillas, Informes y Formularios
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Genera documentos y formularios estructurados y envíalos automáticamente por WhatsApp a tus clientes.
              </p>
            </div>

            {/* Template Selector Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DEFAULT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tpl.id);
                    setTemplateFormData({});
                  }}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    selectedTemplateId === tpl.id
                      ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-900/70'
                  }`}
                >
                  <div className="font-bold text-slate-100 text-base mb-2">{tpl.title}</div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 uppercase tracking-wider w-fit">
                    {tpl.category}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected Template Form & Live Preview */}
            {(() => {
              const currentTpl = DEFAULT_TEMPLATES.find(t => t.id === selectedTemplateId);
              if (!currentTpl) return null;
              const generatedText = currentTpl.templateContent(templateFormData);

              return (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Input Form */}
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-emerald-400" />
                      Llenar Campos del Documento
                    </h3>

                    {currentTpl.fields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <label className="text-xs text-slate-400 font-medium">{field.label}</label>
                        <input
                          type="text"
                          value={templateFormData[field.key] || ''}
                          onChange={(e) => setTemplateFormData({ ...templateFormData, [field.key]: e.target.value })}
                          placeholder={field.placeholder}
                          className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Right: Document Preview & WhatsApp Send */}
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-emerald-400" />
                        Vista Previa del Documento Generado
                      </h3>

                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                        {generatedText}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-800">
                      <label className="text-xs text-slate-400 font-medium block">
                        Número de WhatsApp de Destino (Cliente):
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="tel"
                          value={targetPhoneForDoc}
                          onChange={(e) => setTargetPhoneForDoc(e.target.value)}
                          placeholder="Ej: 56984205124"
                          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={handleSendGeneratedDoc}
                          disabled={sendingDoc || !targetPhoneForDoc.trim()}
                          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {sendingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Enviar por WhatsApp
                        </button>
                      </div>
                      {docSendStatus && (
                        <p className={`text-xs font-semibold mt-2 ${docSendStatus.includes('❌') ? 'text-red-400' : docSendStatus.includes('⚠️') ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {docSendStatus}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* RAG Tab */}
        {activeTab === 'rag' && (
          <KnowledgeBasePanel />
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <BillingPanel />
        )}
        {/* Tenants Admin Tab (SUPER_ADMIN) */}
        {activeTab === 'tenants-admin' && user?.role === 'SUPER_ADMIN' && (
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                  <Shield className="w-7 h-7 text-purple-400" />
                  Panel de Super Administrador
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Administración de Tenants, planes de venta, control de accesos y facturación.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-500/20"
                >
                  <Plus className="w-4 h-4" /> Crear Plan de Venta
                </button>
                <button
                  onClick={() => { loadTenants(); loadSalesPlans(); }}
                  disabled={loadingTenants}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700"
                >
                  {loadingTenants ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Actualizar
                </button>
              </div>
            </div>

            {/* SECCIÓN 1: PLANES DE VENTA DISPONIBLES */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-400" /> Planes de Venta Configurados ({salesPlans.length})
              </h3>
              
              {salesPlans.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center">
                  <p className="text-slate-500 text-sm">No hay planes de venta personalizados creados aún.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {salesPlans.map((p) => (
                    <div key={p.id} className="p-5 rounded-2xl bg-slate-900/60 border border-purple-500/30 space-y-3 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-100 text-base">{p.name}</h4>
                          <p className="text-xs text-slate-400">{p.description || 'Sin descripción'}</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm(`¿Eliminar plan ${p.name}?`)) {
                              await api.deleteSalesPlan(p.id);
                              loadSalesPlans();
                            }
                          }}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-2xl font-extrabold text-purple-400">
                        ${p.price} <span className="text-xs text-slate-400 font-normal">CLP / mes</span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-1 pt-2 border-t border-slate-800">
                        <p>🤖 Max Bots: <span className="font-semibold text-white">{p.maxBots}</span></p>
                        <p>📄 Max RAG Docs: <span className="font-semibold text-white">{p.maxDocs}</span></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECCIÓN 2: LISTADO DE TENANTS Y CONTROL DE ACCESO */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Building className="w-5 h-5 text-purple-400" /> Organizaciones / Tenants ({tenantsList.length})
              </h3>

              {loadingTenants ? (
                <div className="p-12 text-center">
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Cargando organizaciones...</p>
                </div>
              ) : tenantsList.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No hay tenants registrados.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {tenantsList.map((t) => {
                    const bot = t.bots?.[0];
                    const sub = t.subscriptions?.[0];
                    const isTenantActive = t.isActive !== false;

                    return (
                      <div key={t.id} className={`p-6 rounded-2xl bg-slate-900/60 border flex flex-col justify-between space-y-4 transition-all ${
                        isTenantActive ? 'border-purple-500/20 hover:border-purple-500/40' : 'border-red-500/30 bg-red-950/10'
                      }`}>
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <Building className="w-5 h-5 text-purple-400" />
                                <h3 className="font-bold text-slate-100 text-base">{t.name}</h3>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{t.users?.[0]?.email}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                isTenantActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                              }`}>
                                {isTenantActive ? '● ACCESO ACTIVO' : '✕ SUSPENDIDO'}
                              </span>
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                                {sub?.plan || 'STARTER'}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800">
                            <p><span className="text-slate-500">Slug:</span> {t.slug}</p>
                            <p><span className="text-slate-500">Agentes WhatsApp:</span> {t.bots?.length || 0}</p>
                            {bot && (
                              <p className="text-emerald-400 font-medium truncate">
                                <span className="text-slate-500">Modelo IA:</span> {bot.aiModel || 'gpt-4o-mini'}
                              </p>
                            )}
                            <p><span className="text-slate-500">Facturas Registradas:</span> {t.invoices?.length || 0}</p>
                          </div>

                          {/* Selector para cambiar de Plan de Suscripción */}
                          <div className="pt-2">
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Asignar Plan Comercial</label>
                            <select
                              value={sub?.plan || 'STARTER'}
                              onChange={async (e) => {
                                const newPlan = e.target.value;
                                try {
                                  await api.updateTenantSubscription(t.id, {
                                    plan: newPlan,
                                    status: 'ACTIVE',
                                  });
                                  loadTenants();
                                } catch (err: any) {
                                  alert(`Error: ${err.message}`);
                                }
                              }}
                              className="w-full p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-purple-500"
                            >
                              <option value="STARTER">Plan Starter ($29/mes)</option>
                              <option value="PRO">Plan Pro ($79/mes)</option>
                              <option value="ENTERPRISE">Plan Enterprise</option>
                              {salesPlans.map(sp => (
                                <option key={sp.id} value={sp.name}>{sp.name} (${sp.price}/mes)</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="pt-3 border-t border-slate-800 space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedTenantForEdit(t);
                                setTenantAiModel(bot?.aiModel || 'gpt-4o-mini');
                                setTenantPrompt(bot?.systemPrompt || '');
                                setTenantSaveStatus(null);
                              }}
                              className="flex-1 py-1.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-semibold text-xs border border-purple-500/30 flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Sliders className="w-3.5 h-3.5" /> Configurar IA
                            </button>

                            <button
                              onClick={() => {
                                setInvoiceModalTenant(t);
                                setInvoiceForm({ amount: 29000, description: 'Suscripción Mensual Agente WhatsApp IA', phone: bot?.phoneNumber || '' });
                                setInvoiceStatusMsg(null);
                              }}
                              className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold text-xs border border-emerald-500/30 flex items-center justify-center gap-1.5 transition-all"
                            >
                              <FileText className="w-3.5 h-3.5" /> Facturar
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  await api.toggleTenantStatus(t.id, !isTenantActive);
                                  loadTenants();
                                } catch (err: any) {
                                  alert(`Error: ${err.message}`);
                                }
                              }}
                              className={`flex-1 py-1.5 px-3 rounded-xl font-semibold text-xs border flex items-center justify-center gap-1.5 transition-all ${
                                isTenantActive 
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20' 
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                              }`}
                            >
                              {isTenantActive ? 'Suspender Acceso' : 'Reactivar Acceso'}
                            </button>

                            <button
                              onClick={async () => {
                                if (confirm(`¿Seguro que deseas eliminar el tenant "${t.name}" y todos sus datos?`)) {
                                  try {
                                    await api.deleteTenant(t.id);
                                    loadTenants();
                                  } catch (err: any) {
                                    alert(`Error: ${err.message}`);
                                  }
                                }
                              }}
                              className="p-1.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20"
                              title="Eliminar Tenant"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal / Panel para Editar Configuración de IA de Tenant Seleccionado */}
            {selectedTenantForEdit && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-purple-500/40 shadow-2xl space-y-6">
                <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Sliders className="w-6 h-6 text-purple-400" />
                    <div>
                      <h3 className="font-bold text-lg text-slate-100">Configuración de IA para Tenant: {selectedTenantForEdit.name}</h3>
                      <p className="text-xs text-slate-400">Asigna el modelo de IA y personaliza el system prompt exclusivo de este cliente.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTenantForEdit(null)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Modelo de IA Asignado</label>
                    <select
                      value={tenantAiModel}
                      onChange={(e) => setTenantAiModel(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-purple-500"
                    >
                      <optgroup label="OpenAI">
                        <option value="gpt-4o-mini">OpenAI GPT-4o-mini</option>
                        <option value="gpt-4o">OpenAI GPT-4o</option>
                        <option value="o3-mini">OpenAI o3-mini</option>
                      </optgroup>
                      <optgroup label="Anthropic Claude">
                        <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                        <option value="claude-3-5-haiku">Claude 3.5 Haiku</option>
                      </optgroup>
                      <optgroup label="Google Gemini">
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                      </optgroup>
                      <optgroup label="DeepSeek">
                        <option value="deepseek-chat">DeepSeek-V3 Chat</option>
                        <option value="deepseek-r1">DeepSeek-R1</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">System Prompt por Defecto</label>
                    <textarea
                      value={tenantPrompt}
                      onChange={(e) => setTenantPrompt(e.target.value)}
                      rows={6}
                      className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-500 font-mono text-sm"
                      placeholder="Escribe las instrucciones para el agente..."
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={async () => {
                        setSavingTenantAi(true);
                        setTenantSaveStatus(null);
                        try {
                          await api.updateTenantAiConfig(selectedTenantForEdit.id, {
                            aiModel: tenantAiModel,
                            systemPrompt: tenantPrompt,
                          });
                          setTenantSaveStatus('✅ Configuración de IA guardada exitosamente');
                          await loadTenants();
                          await loadBots();
                        } catch (err: any) {
                          setTenantSaveStatus(`❌ Error: ${err.message}`);
                        } finally {
                          setSavingTenantAi(false);
                        }
                      }}
                      disabled={savingTenantAi}
                      className="px-6 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 font-semibold text-slate-950 transition-all text-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      {savingTenantAi ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Guardar Configuración de IA
                    </button>
                    {tenantSaveStatus && (
                      <span className={`text-xs font-medium ${tenantSaveStatus.includes('❌') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {tenantSaveStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* MODAL CREAR PLAN DE VENTA */}
            {showPlanModal && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                      <Plus className="w-4 h-4 text-purple-400" /> Crear Plan de Venta
                    </h3>
                    <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await api.createSalesPlan(planForm);
                        setShowPlanModal(false);
                        setPlanForm({ name: '', description: '', price: 29, maxBots: 1, maxDocs: 50 });
                        loadSalesPlans();
                      } catch (err: any) {
                        alert(`Error al crear plan: ${err.message}`);
                      }
                    }}
                    className="space-y-3 text-xs"
                  >
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Nombre del Plan</label>
                      <input
                        type="text"
                        required
                        value={planForm.name}
                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                        placeholder="Ej. Plan PyME Plus"
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Descripción corta</label>
                      <input
                        type="text"
                        value={planForm.description}
                        onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                        placeholder="Ej. Ideal para pequeños negocios"
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Precio (CLP)</label>
                        <input
                          type="number"
                          required
                          value={planForm.price}
                          onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                          className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Max Bots</label>
                        <input
                          type="number"
                          required
                          value={planForm.maxBots}
                          onChange={(e) => setPlanForm({ ...planForm, maxBots: parseInt(e.target.value) || 1 })}
                          className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">Max Docs RAG</label>
                        <input
                          type="number"
                          required
                          value={planForm.maxDocs}
                          onChange={(e) => setPlanForm({ ...planForm, maxDocs: parseInt(e.target.value) || 50 })}
                          className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-purple-500"
                        />
                      </div>
                    </div>
                    <div className="pt-3">
                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 font-bold text-slate-950 transition-all shadow-lg shadow-purple-500/20"
                      >
                        Guardar Plan Comercial
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* MODAL FACTURAR TENANT */}
            {invoiceModalTenant && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-400" /> Emitir Factura: {invoiceModalTenant.name}
                    </h3>
                    <button onClick={() => setInvoiceModalTenant(null)} className="text-slate-400 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSendingInvoice(true);
                      setInvoiceStatusMsg(null);
                      try {
                        await api.createTenantInvoice(invoiceModalTenant.id, {
                          amount: invoiceForm.amount,
                          description: invoiceForm.description,
                          customerPhone: invoiceForm.phone,
                        });
                        setInvoiceStatusMsg('✅ Factura emitida y notificada por WhatsApp');
                        setTimeout(() => {
                          setInvoiceModalTenant(null);
                          loadTenants();
                        }, 1500);
                      } catch (err: any) {
                        setInvoiceStatusMsg(`❌ Error: ${err.message}`);
                      } finally {
                        setSendingInvoice(false);
                      }
                    }}
                    className="space-y-3 text-xs"
                  >
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Monto (CLP)</label>
                      <input
                        type="number"
                        required
                        value={invoiceForm.amount}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Descripción del Cobro</label>
                      <input
                        type="text"
                        required
                        value={invoiceForm.description}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Teléfono WhatsApp para Envío</label>
                      <input
                        type="text"
                        placeholder="Ej. 56912345678"
                        value={invoiceForm.phone}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, phone: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500"
                      />
                    </div>
                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={sendingInvoice}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        {sendingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Emitir y Notificar Factura
                      </button>
                    </div>
                    {invoiceStatusMsg && (
                      <p className={`text-center text-xs font-medium ${invoiceStatusMsg.includes('❌') ? 'text-red-400' : 'text-emerald-400'}`}>
                        {invoiceStatusMsg}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Componente de Guía e Instructivo Interactivo */}
        <InteractiveHelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          onNavigateTab={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }}
        />
      </main>
    </div>
  );
}
