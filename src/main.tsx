import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import { SpressoConvexProvider } from './lib/convex';

// Expose Data Connect SDK globally for Kotlin WasmJS interop
import * as DataConnectSDK from './dataconnect';
(window as any).SpressoDataConnect = DataConnectSDK;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        const status = (error as { status?: number; code?: number })?.status
          ?? (error as { code?: number })?.code;
        return status === undefined || status === 408 || status === 429 || status >= 500;
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SpressoConvexProvider>
        <App />
      </SpressoConvexProvider>
    </QueryClientProvider>
  </StrictMode>,
);
