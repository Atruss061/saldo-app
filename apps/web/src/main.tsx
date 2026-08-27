import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ConfirmProvider } from "@/components/Confirm";
import { LanguageProvider } from "@/lib/i18n";
import { App } from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      // mantém os dados já carregados na tela enquanto busca os novos
      // (troca de mês/ano/tela sem "piscar" nem mostrar spinner à toa)
      placeholderData: keepPreviousData,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ConfirmProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ConfirmProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
