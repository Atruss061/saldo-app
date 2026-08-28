import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MonthPage } from "@/pages/MonthPage";
import { RecurringPage } from "@/pages/RecurringPage";
import { PlanningPage } from "@/pages/PlanningPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { BankPage } from "@/pages/BankPage";
import { BankCallbackPage } from "@/pages/BankCallbackPage";
import { PrivacyPage, TermsPage } from "@/pages/LegalPages";
import { SettingsPage } from "@/pages/SettingsPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrar" element={<RegisterPage />} />
        <Route path="/privacidade" element={<PrivacyPage />} />
        <Route path="/termos" element={<TermsPage />} />

        {/* Protegidas */}
        <Route element={<ProtectedRoute />}>
          {/* Passo a passo inicial — tela cheia, fora do layout com menu */}
          <Route path="/bem-vindo" element={<OnboardingPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/mes" element={<MonthPage />} />
            <Route path="/fixos" element={<RecurringPage />} />
            <Route path="/metas" element={<PlanningPage initial="metas" />} />
            <Route path="/investimentos" element={<PlanningPage initial="investimentos" />} />
            <Route path="/categorias" element={<CategoriesPage />} />
            <Route path="/banco" element={<BankPage />} />
            <Route path="/banco/callback" element={<BankCallbackPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
