import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireSession } from '@/features/auth/RequireSession';
import { EmployeeDetailPage } from '@/features/employees/EmployeeDetailPage';
import { EmployeesPage } from '@/features/employees/EmployeesPage';
import { InsightsPage } from '@/features/insights/InsightsPage';

/** The route table. Everything except the login page needs a signed-in session. */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireSession />}>
        <Route element={<AppLayout />}>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
          <Route path="/insights" element={<InsightsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/employees" replace />} />
    </Routes>
  );
}
