import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireSession } from '@/features/auth/RequireSession';
import { EmployeeDetailPage } from '@/features/employees/EmployeeDetailPage';
import { EmployeesPage } from '@/features/employees/EmployeesPage';

// The charting library is large, so it is only downloaded when Insights is opened.
const InsightsPage = lazy(() =>
  import('@/features/insights/InsightsPage').then((module) => ({ default: module.InsightsPage })),
);

/** The route table. Everything except the login page needs a signed-in session. */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireSession />}>
        <Route element={<AppLayout />}>
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:id" element={<EmployeeDetailPage />} />
          <Route
            path="/insights"
            element={
              <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
                <InsightsPage />
              </Suspense>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/employees" replace />} />
    </Routes>
  );
}
