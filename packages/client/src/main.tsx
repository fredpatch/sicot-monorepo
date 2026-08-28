import './index.css';
import './i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { routeConfig } from './router';

// createBrowserRouter() built here, not in router.tsx - it calls
// createBrowserHistory() eagerly (needs `document`), so router.tsx only
// exports the plain route tree, importable from client-package tests that
// have no jsdom (see router.routes.test.ts).
const router = createBrowserRouter(routeConfig);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
