import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TransactionModalProvider } from "./NewTransactionModal";

export function AppLayout() {
  return (
    <TransactionModalProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-container px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </TransactionModalProvider>
  );
}
