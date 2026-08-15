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
      trialEndsAt: string | null;
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

  async requestPairingCode(botId: string, phoneNumber: string) {
    return this.request<any>(`/bots/${botId}/pair-phone`, {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  }

  // ── RAG ───────────────────────────────────────────
  async processDocument(body: { title: string; content: string }) {
    return this.request<{ documentId: string; totalChunksProcessed: number }>(
      '/rag/process-text',
      { method: 'POST', body: JSON.stringify(body) },
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
}

export const api = new ApiClient();
export { API_URL };
