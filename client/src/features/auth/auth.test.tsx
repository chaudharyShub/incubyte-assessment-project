import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { aPage, mockSignedInApi } from '@/test/fixtures';
import { apiError, mockApi, renderApp, TEST_USER } from '@/test/render-app';

const emptyList = () => ({ body: aPage([]) });

const signedOut = () => apiError(401, 'UNAUTHENTICATED', 'Sign in to continue');

describe('signing in', () => {
  it('sends a visitor who is not signed in to the login page', async () => {
    mockApi({ 'GET /auth/me': signedOut });

    renderApp('/employees');

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Employees' })).not.toBeInTheDocument();
  });

  it('shows the password while the eye is switched on, and hides it again', async () => {
    mockApi({ 'GET /auth/me': signedOut });
    renderApp('/login');
    const password = await screen.findByLabelText('Password');
    await userEvent.type(password, 'secret');
    expect(password).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(password).toHaveValue('secret');

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('asks for the email and password before calling the server', async () => {
    const calls = mockApi({ 'GET /auth/me': signedOut });
    renderApp('/login');

    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'POST')).toEqual([]);
  });

  it('signs in and opens the page the visitor originally asked for', async () => {
    const calls = mockSignedInApi({
      'GET /auth/me': signedOut,
      'POST /auth/login': () => ({ body: { user: TEST_USER } }),
      'GET /employees': emptyList,
    });
    renderApp('/employees?country=IN');

    await userEvent.type(await screen.findByLabelText('Email'), 'hr@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'correct-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Country')).toHaveValue('IN');
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'hr@example.com', password: 'correct-password' },
    });
  });

  it("shows the server's message when the credentials are wrong", async () => {
    mockApi({
      'GET /auth/me': signedOut,
      'POST /auth/login': () =>
        apiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect'),
    });
    renderApp('/login');

    await userEvent.type(await screen.findByLabelText('Email'), 'hr@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});

describe('when signed in', () => {
  it('shows the page with navigation and the name of the user', async () => {
    mockSignedInApi({ 'GET /employees': emptyList });

    renderApp('/employees');

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Insights' })).toBeInTheDocument();
    expect(screen.getByText('HR Manager')).toBeInTheDocument();
  });

  it('skips the login page', async () => {
    mockSignedInApi({ 'GET /employees': emptyList });

    renderApp('/login');

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument();
  });

  it('returns to the login page after signing out', async () => {
    mockSignedInApi({
      'GET /employees': emptyList,
      'POST /auth/logout': () => ({ status: 204 }),
    });
    renderApp('/employees');

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });
});

describe('when the server cannot be reached', () => {
  it('says so and offers to try again', async () => {
    mockApi({ 'GET /auth/me': () => apiError(503, 'UNAVAILABLE', 'Service unavailable') });

    renderApp('/employees');

    expect(await screen.findByText('We could not reach the server.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
