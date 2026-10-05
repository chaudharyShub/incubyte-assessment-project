import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/FieldError';
import { useLogin, useSession, type Credentials } from './session';

export function LoginPage() {
  const { data: user } = useSession();
  const login = useLogin();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Credentials>();

  if (user) {
    // Go back to the page that sent the user here, if there was one.
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? '/employees'} replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Salary Management</CardTitle>
          <CardDescription>Sign in to manage employee salaries.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            className="grid gap-4"
            onSubmit={handleSubmit((credentials) => login.mutate(credentials))}
          >
            {login.isError && (
              <Alert variant="destructive">
                <AlertDescription>{login.error.message}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                aria-invalid={Boolean(errors.email)}
                aria-describedby="email-error"
                {...register('email', { required: 'Enter your email' })}
              />
              <FieldError id="email-error" message={errors.email?.message} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-error"
                {...register('password', { required: 'Enter your password' })}
              />
              <FieldError id="password-error" message={errors.password?.message} />
            </div>

            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
