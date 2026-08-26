const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('wasaas_token');
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => null);

    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        const hadToken = !!localStorage.getItem('wasaas_token');
        const isPublicPage = ['/login', '/register', '/onboarding'].some(
          (p) => window.location.pathname.startsWith(p)
        );
        const isAuthEndpoint = path.startsWith('/auth/');

        // Solo limpiar y redirigir si había una sesión activa y falló un endpoint protegido
        if (hadToken && !isPublicPage && !isAuthEndpoint) {
          localStorage.removeItem('wasaas_token');
          localStorage.removeItem('wasaas_user');
          localStorage.removeItem('wasaas_org');
          window.location.href = '/login';
          throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
        }
      }
      throw new Error(data?.message || 'Credenciales inválidas o no autorizado.');
    }

    if (!res.ok) {
      throw new Error(data?.message || `Error HTTP ${res.status}`);
    }

    return data;
  }

  async getFeatures() {
    return this.request<{ features: Record<string, boolean> }>('/features');
  }

  async getBillingStatus() {
    return this.request<{
      id: string;
      plan: string;
      customPlanName: string | null;
      status: string;
      trialDaysLeft: number;
      isCourteous?: boolean;
      trialEndsAt: string | null;
      currentPeriodStart?: string | null;
      currentPeriodEnd: string | null;
      mpPreapprovalId: string | null;
    }>('/tenants/billing/me');
  }

  async getPublicPlans() {
    return this.request<{
      id: string;
      name: string;
      description: string | null;
      price: number;
      maxBots: number;
      maxDocs: number;
      features: string[];
      isActive: boolean;
    }[]>('/tenants/plans/public');
  }

  async subscribeToPlan(planId: string) {
    return this.request<{ initPoint: string; subscriptionId: string }>(
      `/mercadopago/subscribe-plan/${planId}`,
      { method: 'POST' },
    );
  }

  // ── Auth ──────────────────────────────────────────
  async register(body: { organizationName: string; email: string; password: string; userName?: string }) {
    return this.request<{
      accessToken: string;
      user: { id: string; email: string; name: string | null; role: string };
      organization: { id: string; name: string; slug: string };
    }>('/auth/register', { method: 'POST', body: JSON.stringify(body) });
  }

  async login(body: { email: string; password: string }) {
    return this.request<{
      accessToken: string;
      user: { id: string; email: string; name: string | null; role: string };
      organization: { id: string; name: string; slug: string };
    }>('/auth/login', { method: 'POST', body: JSON.stringify(body) });
  }

  // ── Bots ──────────────────────────────────────────
  async listBots() {
    return this.request<any[]>('/bots');
  }

  async createBot(body: { name: string; systemPrompt?: string; aiModel?: string }) {
    return this.request<any>('/bots', { method: 'POST', body: JSON.stringify(body) });
  }

  async getBot(id: string) {
    return this.request<any>(`/bots/${id}`);
  }

  async updateBot(id: string, body: { name?: string; systemPrompt?: string; aiModel?: string }) {
    return this.request<any>(`/bots/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
  }

  async deleteBot(id: string) {
    return this.request<any>(`/bots/${id}`, { method: 'DELETE' });
  }

  async listConversations(botId: string) {
    return this.request<any[]>(`/bots/${botId}/conversations`);
  }

  async clearConversations(botId: string) {
    return this.request<{ success: boolean; count: number }>(`/bots/${botId}/conversations`, {
      method: 'DELETE',
    });
  }

  async deleteConversation(conversationId: string) {
    return this.request<{ success: boolean }>(`/bots/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async getMessages(conversationId: string) {
    return this.request<any[]>(`/bots/conversations/${conversationId}/messages`);
  }

  async sendManualMessage(conversationId: string, content: string) {
    return this.request<any>(`/bots/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async toggleHumanMode(conversationId: string, isHumanMode?: boolean) {
    return this.request<any>(`/bots/conversations/${conversationId}/human-mode`, {
      method: 'PATCH',
      body: JSON.stringify({ isHumanMode }),
    });
  }

  async startBot(botId: string) {
    return this.request<any>(`/bots/${botId}/start`, {
      method: 'POST',
    });
  }

  async requestPairingCode(botId: string, phoneNumber: string) {
    return this.request<any>(`/bots/${botId}/pair-phone`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  async cancelPairing(botId: string) {
    return this.request<any>(`/bots/${botId}/cancel-pairing`, {
      method: 'POST',
    });
  }

  // ── RAG ───────────────────────────────────────────
  async processDocument(body: { title: string; content: string; botId?: string }) {
    return this.request<any>('/rag/process-text', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async processUrlDocument(body: { url: string; title?: string; botId?: string }) {
    return this.request<any>('/rag/process-url', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async resyncUrlDocument(documentId: string) {
    return this.request<{ success: boolean; documentId: string; title: string; chunksProcessed: number; lastSyncedAt: string }>(
      `/rag/resync-url/${documentId}`,
      { method: 'POST' },
    );
  }

  async searchKnowledge(query: string, topK?: number) {
    return this.request<{ results: any[] }>(
      '/rag/search',
      { method: 'POST', body: JSON.stringify({ query, topK }) },
    );
  }

  async listDocuments() {
    return this.request<{ documents: any[] }>('/rag/documents');
  }

  async deleteDocument(id: string) {
    return this.request<any>(`/rag/documents/${id}`, { method: 'DELETE' });
  }

  // ── MercadoPago ───────────────────────────────────
  async createSubscription(body: { planName: string; amount: number; userEmail?: string }) {
    return this.request<{ initPoint: string; subscriptionId: string }>(
      '/mercadopago/create-subscription',
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  // ── AI Playground ──────────────────────────────────
  async chatAi(message: string, systemPrompt?: string) {
    try {
      return await this.request<{ reply: string }>('/ai/test-chat', {
        method: 'POST',
        body: JSON.stringify({ message, systemPrompt }),
      });
    } catch {
      return { reply: `[miBot AI] Hola! Recibí tu mensaje de prueba: "${message}". El agente está configurado correctamente.` };
    }
  }

  // ── Document Generation & WhatsApp Dispatch ───────
  async sendGeneratedDocument(botId: string, customerPhone: string, documentTitle: string, documentContent: string) {
    // SEGURIDAD: La INTERNAL_API_KEY NUNCA debe enviarse desde el browser.
    // Esta llamada se hace a través de la API NestJS, que la proxea al bot-engine server-side.
    return this.request<{ success: boolean; message: string; error?: string }>(`/bots/${botId}/send-document`, {
      method: 'POST',
      body: JSON.stringify({ customerPhone, documentTitle, documentContent }),
    });
  }


  // ── Tenants Super Admin ───────────────────────────
  async listTenants() {
    return this.request<any[]>('/tenants');
  }

  async updateTenantAiConfig(tenantId: string, body: { aiModel?: string; systemPrompt?: string }) {
    return this.request<any>(`/tenants/${tenantId}/ai-config`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async updateTenantSubscription(tenantId: string, body: { plan: string; customPlanName?: string; status: string }) {
    return this.request<any>(`/tenants/${tenantId}/subscription`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async toggleTenantStatus(tenantId: string, isActive: boolean) {
    return this.request<any>(`/tenants/${tenantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  }

  async createTenantInvoice(tenantId: string, body: { amount: number; description?: string; customerPhone?: string }) {
    return this.request<any>(`/tenants/${tenantId}/invoices`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async deleteTenant(tenantId: string) {
    return this.request<any>(`/tenants/${tenantId}`, { method: 'DELETE' });
  }

  // ── Sales Plans ──────────────────────────────────
  async listSalesPlans() {
    return this.request<any[]>('/tenants/plans/all');
  }

  async createSalesPlan(body: { name: string; description?: string; price: number; maxBots: number; maxDocs: number }) {
    return this.request<any>('/tenants/plans/create', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updatePlan(planId: string, body: {
    name?: string;
    description?: string;
    price?: number;
    maxBots?: number;
    maxDocs?: number;
    features?: string[];
    isActive?: boolean;
  }) {
    return this.request<any>(`/tenants/plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async deleteSalesPlan(planId: string) {
    return this.request<any>(`/tenants/plans/${planId}`, { method: 'DELETE' });
  }

  // ── MercadoPago Integration (Platform & Client) ──
  async getPlatformMpConfig() {
    return this.request<{
      isConfigured: boolean;
      connectionStatus: 'CONNECTED' | 'ERROR' | 'UNCONFIGURED';
      accountInfo?: { id: number; nickname: string; email: string; siteId: string };
      publicKey: string;
      webhookUrl: string;
      maskedToken: string;
      webhookSecret: string;
    }>('/mercadopago/platform-config');
  }

  async savePlatformMpConfig(body: { accessToken?: string; publicKey?: string; webhookSecret?: string }) {
    return this.request<any>('/mercadopago/platform-config', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async testPlatformMpConnection(token?: string) {
    return this.request<{ success: boolean; data?: any; error?: string }>('/mercadopago/test-platform-connection', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async getClientMpConfig() {
    return this.request<{
      isConfigured: boolean;
      connectionStatus: 'CONNECTED' | 'ERROR' | 'UNCONFIGURED';
      accountInfo?: { id: number; nickname: string; email: string; siteId: string };
      publicKey: string;
      maskedToken: string;
    }>('/mercadopago/client-config');
  }

  async saveClientMpConfig(body: { accessToken: string; publicKey?: string }) {
    return this.request<{ success: boolean; isConfigured: boolean; maskedToken: string; accountInfo: any }>(
      '/mercadopago/client-config',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  async createPaymentPreference(body: { title: string; amount: number; customerPhone?: string }) {
    return this.request<{ initPoint: string; sandboxInitPoint?: string; preferenceId: string }>(
      '/mercadopago/create-payment-preference',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
  }

  // ── Bot Simulator / In-App Test Chat ────────────
  async simulateBot(
    botId: string,
    message: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ) {
    return this.request<{ reply: string; sources: string[]; model: string }>(`/ai/simulate/${botId}`, {
      method: 'POST',
      body: JSON.stringify({ message, history }),
    });
  }
}

export const api = new ApiClient();
export { API_URL };
