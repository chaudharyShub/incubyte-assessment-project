import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { useSession } from './session';

/** Renders the nested routes for a signed-in user, and sends anyone else to the login page. */
export function RequireSession() {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return <p className="p-8 text-center text-muted-foreground">Loading…</p>;
  }

  if (session.isError) {
    return (
      <div className="grid justify-items-center gap-4 p-8 text-center">
        <p>We could not reach the server.</p>
        <Button variant="outline" onClick={() => session.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
