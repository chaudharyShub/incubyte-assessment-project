/** Field name -> messages, as the API returns for a 400. */
export type FieldErrors = Record<string, string[]>;

/** A response from the API that was not a success. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: FieldErrors,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
}

/**
 * Calls the API and returns the parsed JSON body.
 * Throws an ApiError carrying the server's code, message and field errors.
 */
export async function api<T>(path: string, { method = 'GET', body }: RequestOptions = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    // The session lives in a cookie on this same origin.
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Something went wrong. Please try again.',
      error?.details,
    );
  }
  return payload as T;
}
