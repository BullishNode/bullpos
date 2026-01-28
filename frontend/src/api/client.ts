/**
 * API client for BullPOS backend
 * Handles HTTP requests to backend endpoints
 */

/**
 * Get the backend API base URL
 * In production, this should be configured via environment variable
 * For development, defaults to localhost:3000
 */
export function getApiBaseUrl(): string {
  // Check if we're in development (webpack dev server) or production
  // webpack injects NODE_ENV at build time
  // eslint-disable-next-line no-undef
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    // In production, use same origin (frontend and backend on same domain)
    return window.location.origin;
  }
  // Development: backend runs on port 3000
  return 'http://localhost:3000';
}

/**
 * HTTP error response from API
 */
export interface ApiError {
  error: string;
  details?: unknown;
}

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Make a GET request to the API
 * @param path - API path (e.g., "/api/links/abc123")
 * @returns Parsed JSON response
 * @throws ApiClientError on HTTP error or network failure
 */
export async function apiGet<T>(path: string): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // Try to parse error response
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let details: unknown = undefined;

      try {
        const errorData = await response.json() as ApiError;
        errorMessage = errorData.error || errorMessage;
        details = errorData.details;
      } catch {
        // If JSON parsing fails, use default error message
      }

      throw new ApiClientError(errorMessage, response.status, details);
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Network error or other fetch failure
    throw new ApiClientError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0 // 0 indicates network error, not HTTP error
    );
  }
}

/**
 * Make a POST request to the API
 * @param path - API path (e.g., "/api/links")
 * @param body - Request body (will be JSON-stringified)
 * @param authToken - Optional JWT token for authentication
 * @returns Parsed JSON response
 * @throws ApiClientError on HTTP error or network failure
 */
export async function apiPost<T>(
  path: string,
  body: unknown,
  authToken?: string
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let details: unknown = undefined;

      try {
        const errorData = await response.json() as ApiError;
        errorMessage = errorData.error || errorMessage;
        details = errorData.details;
      } catch {
        // Ignore JSON parse errors
      }

      throw new ApiClientError(errorMessage, response.status, details);
    }

    return await response.json() as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      0
    );
  }
}
