import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./features/auth/LoginPage";
import { SetupPage } from "./features/auth/SetupPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { VehiclesPage } from "./features/vehicles/VehiclesPage";
import { VehicleFormPage } from "./features/vehicles/VehicleFormPage";
import { VehicleDetailPage } from "./features/vehicles/VehicleDetailPage";
import { ReservationsPage } from "./features/reservations/ReservationsPage";
import { ReservationFormPage } from "./features/reservations/ReservationFormPage";
import { ReservationDetailPage } from "./features/reservations/ReservationDetailPage";
import { CalendarPage } from "./features/calendar/CalendarPage";
import { CustomersPage } from "./features/customers/CustomersPage";
import { CustomerDetailPage } from "./features/customers/CustomerDetailPage";
import { MaintenancePage } from "./features/maintenance/MaintenancePage";
import { AlertsPage } from "./features/alerts/AlertsPage";
import { FinancePage } from "./features/finance/FinancePage";
import { UsersPage } from "./features/users/UsersPage";
import { Skeleton } from "./components/ui";

function Guard({ children }: { children: ReactNode }) {
  const { ready, token, setupRequired } = useAuth();
  if (!ready) return <div className="p-8"><Skeleton className="h-24" /></div>;
  if (setupRequired) return <Navigate to="/setup" replace />;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function SuperAdminOnly({ children }: { children: ReactNode }) {
  const { admin } = useAuth();
  if (admin?.role !== "SuperAdmin") return <Navigate to="/" replace />;
  return children;
}

export function App() {
  const { ready, token, setupRequired } = useAuth();
  return (
    <Routes>
      <Route path="/setup" element={setupRequired ? <SetupPage /> : <Navigate to={token ? "/" : "/login"} replace />} />
      <Route path="/login" element={!ready ? null : token ? <Navigate to="/" replace /> : setupRequired ? <Navigate to="/setup" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <Guard>
            <AppShell />
          </Guard>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="vehicles/new" element={<VehicleFormPage />} />
        <Route path="vehicles/:id/edit" element={<VehicleFormPage />} />
        <Route path="vehicles/:id" element={<VehicleDetailPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="reservations/new" element={<ReservationFormPage />} />
        <Route path="reservations/:id" element={<ReservationDetailPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route
          path="users"
          element={
            <SuperAdminOnly>
              <UsersPage />
            </SuperAdminOnly>
          }
        />
      </Route>
    </Routes>
  );
}
