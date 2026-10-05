import { QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';

export const SESSION_QUERY_KEY = ['session'] as const;

export function createQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // A 4xx will not get better by asking again; only retry failures that might.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        // The session expired mid-use: forget the user, which sends them to the login page.
        if (error instanceof ApiError && error.status === 401) {
          queryClient.setQueryData(SESSION_QUERY_KEY, null);
        }
      },
    }),
  });
  return queryClient;
}
