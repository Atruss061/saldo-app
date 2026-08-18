import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { MonthPage } from "@/pages/MonthPage";
import { InvestmentsPage } from "@/pages/InvestmentsPage";
import { GoalsPage } from "@/pages/GoalsPage";
import { CategoriesPage } from "@/pages/CategoriesPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrar" element={<RegisterPage />} />

        {/* Protegidas */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/mes" element={<MonthPage />} />
            <Route path="/investimentos" element={<InvestmentsPage />} />
            <Route path="/metas" element={<GoalsPage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
