import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-9"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby="password-error"
                  {...register('password', { required: 'Enter your password' })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((shown) => !shown)}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden="true" />
                  ) : (
                    <Eye className="size-4" aria-hidden="true" />
                  )}
                </button>
              </div>
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
