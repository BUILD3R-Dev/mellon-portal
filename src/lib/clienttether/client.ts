interface ClientTetherConfig {
  apiUrl: string;
  accessToken: string;
  webKey?: string;
}

interface ApiResponse<T> {
  data: T;
  error?: string;
}

/**
 * ClientTether API response types
 */

export interface CTLeadResponse {
  client_id: string;
  firstName?: string;
  lastName?: string;
  compName?: string;
  email?: string;
  phone?: string;
  clients_lead_source?: string;
  clients_sales_cycle?: string;
  deal_size?: string;
  created?: string;
  last_modified_date?: string;
  contact_type?: string;
  assigned_user?: string;
  clients_action_plan?: string;
  // Legacy aliases for backwards compatibility
  id?: string;
  source?: string;
  status?: string;
}

export interface CTOpportunityResponse {
  opportunity_id: string;
  firstName?: string;
  lastName?: string;
  compName?: string;
  contact_sales_cycle?: string;
  deal_size?: string;
  created?: string;
  last_modified_date?: string;
  contact_lead_source?: string;
  contact_action_plan?: string;
  // Legacy aliases
  id?: string;
  title?: string;
  value?: number;
  stage?: string;
  probability?: number;
}

export interface CTNoteResponse {
  id: string;
  contact_id: string;
  date: string;
  author: string;
  content: string;
}

export interface CTActivityResponse {
  id: string;
  type: string;
  scheduled_at: string;
  contact_name: string;
  description: string;
  status: string;
}

export class ClientTetherClient {
  private apiUrl: string;
  private accessToken: string;
  private webKey?: string;

  constructor(config: ClientTetherConfig) {
    this.apiUrl = config.apiUrl.replace(/\/+$/, '');
    this.accessToken = config.accessToken;
    this.webKey = config.webKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.apiUrl}/v2/api/${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Access-Token': this.accessToken,
      ...(this.webKey && { 'X-Web-Key': this.webKey }),
      ...(options.headers as Record<string, string>),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { data: null as T, error: `API Error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      // CT API wraps results in a "data" key
      return { data: data.data ?? data };
    } catch (error) {
      return { data: null as T, error: `Network Error: ${error}` };
    }
  }

  async getLeads(params?: { modifiedSince?: string }): Promise<ApiResponse<CTLeadResponse[]>> {
    return this.request<CTLeadResponse[]>('read_client_list');
  }

  async getOpportunities(params?: { modifiedSince?: string }): Promise<ApiResponse<CTOpportunityResponse[]>> {
    return this.request<CTOpportunityResponse[]>('read_opportunity_list');
  }

  async getSalesCycles(): Promise<ApiResponse<unknown[]>> {
    return this.request<unknown[]>('read_sales_cycle_list');
  }

  async getEvents(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<unknown[]>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('start_date', params.startDate);
    if (params?.endDate) queryParams.set('end_date', params.endDate);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<unknown[]>(`read_sales_cycle_any_activity${query}`);
  }

  async getNotes(params?: { contactId?: string; since?: string }): Promise<ApiResponse<CTNoteResponse[]>> {
    if (params?.contactId) {
      return this.request<CTNoteResponse[]>(`read_client_history_notes/${params.contactId}`);
    }
    // Without a contact ID, we can't fetch notes (CT API requires it)
    return { data: [], error: undefined };
  }

  async getScheduledActivities(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<CTActivityResponse[]>> {
    // CT API doesn't have a direct scheduled activities list endpoint
    // Return empty for now - activities come through contact history
    return { data: [], error: undefined };
  }
}

export function createClientTetherClient(webKey?: string, accessToken?: string): ClientTetherClient {
  const apiUrl = process.env.CLIENTTETHER_API_URL || 'https://api.clienttether.com';
  const resolvedAccessToken = accessToken || process.env.CLIENTTETHER_ACCESS_TOKEN || '';

  return new ClientTetherClient({
    apiUrl,
    accessToken: resolvedAccessToken,
    webKey,
  });
}
