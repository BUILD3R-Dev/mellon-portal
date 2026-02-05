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
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: string;
  created_at?: string;
  modified_at?: string;
}

export interface CTOpportunityResponse {
  id: string;
  lead_id?: string;
  title?: string;
  value?: number;
  stage?: string;
  probability?: number;
  expected_close_date?: string;
  created_at?: string;
  modified_at?: string;
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
    this.apiUrl = config.apiUrl;
    this.accessToken = config.accessToken;
    this.webKey = config.webKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.apiUrl}${endpoint}`;
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
      return { data };
    } catch (error) {
      return { data: null as T, error: `Network Error: ${error}` };
    }
  }

  async getLeads(params?: { modifiedSince?: string }): Promise<ApiResponse<CTLeadResponse[]>> {
    const queryParams = new URLSearchParams();
    if (params?.modifiedSince) {
      queryParams.set('modified_since', params.modifiedSince);
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<CTLeadResponse[]>(`/leads${query}`);
  }

  async getOpportunities(params?: { modifiedSince?: string }): Promise<ApiResponse<CTOpportunityResponse[]>> {
    const queryParams = new URLSearchParams();
    if (params?.modifiedSince) {
      queryParams.set('modified_since', params.modifiedSince);
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<CTOpportunityResponse[]>(`/opportunities${query}`);
  }

  async getSalesCycles(): Promise<ApiResponse<unknown[]>> {
    return this.request<unknown[]>('/sales-cycles');
  }

  async getEvents(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<unknown[]>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('start_date', params.startDate);
    if (params?.endDate) queryParams.set('end_date', params.endDate);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<unknown[]>(`/events${query}`);
  }

  async getNotes(params?: { contactId?: string; since?: string }): Promise<ApiResponse<CTNoteResponse[]>> {
    const queryParams = new URLSearchParams();
    if (params?.contactId) queryParams.set('contact_id', params.contactId);
    if (params?.since) queryParams.set('since', params.since);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<CTNoteResponse[]>(`/notes${query}`);
  }

  async getScheduledActivities(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse<CTActivityResponse[]>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('start_date', params.startDate);
    if (params?.endDate) queryParams.set('end_date', params.endDate);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<CTActivityResponse[]>(`/activities${query}`);
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
