interface ClientTetherConfig {
  apiUrl: string;
  accessToken: string;
  webKey?: string;
}

interface ApiResponse<T> {
  data: T;
  error?: string;
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
      Authorization: `Bearer ${this.accessToken}`,
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

  async getLeads(params?: { modifiedSince?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.modifiedSince) {
      queryParams.set('modified_since', params.modifiedSince);
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<unknown[]>(`/leads${query}`);
  }

  async getOpportunities(params?: { modifiedSince?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.modifiedSince) {
      queryParams.set('modified_since', params.modifiedSince);
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<unknown[]>(`/opportunities${query}`);
  }

  async getSalesCycles() {
    return this.request<unknown[]>('/sales-cycles');
  }

  async getEvents(params?: { startDate?: string; endDate?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('start_date', params.startDate);
    if (params?.endDate) queryParams.set('end_date', params.endDate);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<unknown[]>(`/events${query}`);
  }
}

export function createClientTetherClient(webKey?: string): ClientTetherClient {
  const apiUrl = process.env.CLIENTTETHER_API_URL || 'https://api.clienttether.com';
  const accessToken = process.env.CLIENTTETHER_ACCESS_TOKEN || '';

  return new ClientTetherClient({
    apiUrl,
    accessToken,
    webKey,
  });
}
