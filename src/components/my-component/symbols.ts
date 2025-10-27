export interface ContextOption {
  id: number;
  value: string;
  useMock?: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
