import { Link, NavLink, Outlet } from 'react-router';
import { Button } from '@/components/ui/button';
import { useLogout, useSession } from '@/features/auth/session';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/employees', label: 'Employees' },
  { to: '/insights', label: 'Insights' },
];

/** The frame around every signed-in page: title, navigation, and who is signed in. */
export function AppLayout() {
  const { data: user } = useSession();
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          {/* The employee list is the home page. */}
          <Link to="/employees" className="font-semibold">
            Salary Management
          </Link>

          <nav aria-label="Main" className="flex gap-1">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground',
                    isActive && 'bg-muted text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">{user?.name}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
