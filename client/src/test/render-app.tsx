import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { App } from '@/App';
import { createQueryClient } from '@/lib/query-client';

export const TEST_USER = { id: 1, email: 'hr@example.com', name: 'HR Manager' };

interface MockResponse {
  status?: number;
  body?: unknown;
}

/** "METHOD /path" -> what the fake API answers. The handler receives the parsed request body. */
type Handlers = Record<string, (body: unknown, url: URL) => MockResponse>;

export interface ApiCall {
  method: string;
  path: string;
  body: unknown;
}

/**
 * Replaces `fetch` with a fake API for one test. A request with no handler
 * fails loudly, so a test cannot pass by accident on a call it did not expect.
 * Returns the calls made so far, in order.
 */
export function mockApi(handlers: Handlers): ApiCall[] {
  const calls: ApiCall[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const url = new URL(input, 'http://localhost');
      const method = init.method ?? 'GET';
      const path = url.pathname.replace(/^\/api/, '');
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
      calls.push({ method, path: path + url.search, body });

      const handler = handlers[`${method} ${path}`];
      if (!handler) throw new Error(`No mock for ${method} ${path}`);

      const { status = 200, body: responseBody } = handler(body, url);
      return new Response(status === 204 ? null : JSON.stringify(responseBody ?? {}), { status });
    }),
  );

  return calls;
}

/** A fake API error body in the server's standard shape. */
export function apiError(status: number, code: string, message: string, details?: object) {
  return { status, body: { error: { code, message, details } } };
}

/** Renders the whole app at `path`, with its own query cache so tests do not share data. */
export function renderApp(path = '/') {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
