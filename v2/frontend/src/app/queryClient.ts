import { QueryClient } from '@tanstack/vue-query';

/**
 * Vue Query Client
 * 
 * Konfiguriert mit Retry-Logic, Cache-Zeiten, etc.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential Backoff
      staleTime: 5 * 60 * 1000, // 5 Minuten
      gcTime: 10 * 60 * 1000, // 10 Minuten (früher cacheTime)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true
    },
    mutations: {
      retry: 1, // Mutations nur einmal retry
      retryDelay: 1000
    }
  }
});

