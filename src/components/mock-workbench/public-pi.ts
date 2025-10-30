export interface ContextOption {
	id: number;
	value: string;
	useMock?: boolean;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Schema for the mock metadata (excluding the response body)
export interface MockSchema {
	nameMock: string;
	serviceCode: string;
	url: string;
	httpMethod: HttpMethod;
	httpCodeResponseValue: number;
	delayMs: number;
	headers?: Record<string, string>;
}

// Response body payload shape
export interface MockBody {
	responseBody: string;
}
