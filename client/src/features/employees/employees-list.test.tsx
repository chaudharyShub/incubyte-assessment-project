import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { anEmployee, aPage, mockSignedInApi } from '@/test/fixtures';
import { apiError, renderApp, type ApiCall } from '@/test/render-app';

const ASHA = anEmployee();
const BEN = anEmployee({
  id: 2,
  name: 'Ben Carter',
  email: 'ben.carter@example.com',
  countryCode: 'US',
  countryName: 'United States',
  salary: '5000.00',
  currencyCode: 'USD',
  salaryInr: '440000.00',
  status: 'inactive',
});

/** The query string of the most recent request for the employee list. */
function lastListQuery(calls: ApiCall[]): Record<string, string> {
  const call = calls.findLast((c) => c.path.startsWith('/employees?'))!;
  return Object.fromEntries(new URLSearchParams(call.path.split('?')[1]));
}

describe('employee list', () => {
  it('shows each employee with salary in local currency and its INR equivalent', async () => {
    mockSignedInApi({ 'GET /employees': () => ({ body: aPage([ASHA, BEN]) }) });

    renderApp('/employees');

    const asha = (await screen.findByRole('link', { name: 'Asha Rao' })).closest('tr')!;
    expect(within(asha).getByText('₹80,000')).toBeInTheDocument();
    expect(within(asha).getByText('Active')).toBeInTheDocument();

    const ben = screen.getByRole('link', { name: 'Ben Carter' }).closest('tr')!;
    expect(within(ben).getByText('$5,000')).toBeInTheDocument();
    expect(within(ben).getByText('₹4,40,000')).toBeInTheDocument();
    expect(within(ben).getByText('Inactive')).toBeInTheDocument();
  });

  it('opens an employee when any part of their row is clicked', async () => {
    mockSignedInApi({
      'GET /employees': () => ({ body: aPage([ASHA, BEN]) }),
      'GET /employees/2': () => ({ body: { employee: BEN } }),
      'GET /employees/2/salary-history': () => ({ body: { history: [] } }),
    });

    renderApp('/employees');
    const ben = (await screen.findByRole('link', { name: 'Ben Carter' })).closest('tr')!;

    await userEvent.click(within(ben).getByText('United States'));

    expect(await screen.findByRole('heading', { name: 'Ben Carter' })).toBeInTheDocument();
  });

  it('asks for the first page sorted by name to begin with', async () => {
    const calls = mockSignedInApi({ 'GET /employees': () => ({ body: aPage([ASHA]) }) });

    renderApp('/employees');
    await screen.findByRole('link', { name: 'Asha Rao' });

    expect(lastListQuery(calls)).toEqual({ sort: 'name', order: 'asc', page: '1', pageSize: '25' });
  });

  it('shows how many employees match and which page is open', async () => {
    mockSignedInApi({
      'GET /employees': () => ({ body: aPage([ASHA], { total: 10000, page: 3 }) }),
    });

    renderApp('/employees?page=3');

    expect(await screen.findByText('Showing 51–75 of 10,000')).toBeInTheDocument();
    expect(screen.getByText('Page 3 of 400')).toBeInTheDocument();
  });

  it('searches once the user stops typing', async () => {
    const calls = mockSignedInApi({ 'GET /employees': () => ({ body: aPage([ASHA]) }) });
    renderApp('/employees');
    await screen.findByRole('link', { name: 'Asha Rao' });

    await userEvent.type(screen.getByRole('searchbox'), 'asha');

    await waitFor(() => expect(lastListQuery(calls).search).toBe('asha'));
    const searches = calls.filter((call) => call.path.includes('search='));
    expect(searches).toHaveLength(1);
  });

  it('filters by country, department, level and status', async () => {
    const calls = mockSignedInApi({ 'GET /employees': () => ({ body: aPage([ASHA]) }) });
    renderApp('/employees');
    await screen.findByRole('link', { name: 'Asha Rao' });

    await userEvent.selectOptions(screen.getByLabelText('Country'), 'United States');
    await userEvent.selectOptions(screen.getByLabelText('Department'), 'Sales');
    await userEvent.selectOptions(screen.getByLabelText('Level'), 'Senior');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'Inactive');

    await waitFor(() =>
      expect(lastListQuery(calls)).toMatchObject({
        country: 'US',
        department: '2',
        level: '2',
        status: 'inactive',
      }),
    );
  });

  it('goes back to the first page when a filter changes', async () => {
    const calls = mockSignedInApi({
      'GET /employees': () => ({ body: aPage([ASHA], { total: 200, page: 4 }) }),
    });
    renderApp('/employees?page=4');
    await screen.findByRole('link', { name: 'Asha Rao' });

    await userEvent.selectOptions(screen.getByLabelText('Country'), 'India');

    await waitFor(() => expect(lastListQuery(calls)).toMatchObject({ country: 'IN', page: '1' }));
  });

  it('sorts by a column, and reverses it on a second click', async () => {
    const calls = mockSignedInApi({ 'GET /employees': () => ({ body: aPage([ASHA]) }) });
    renderApp('/employees');
    await screen.findByRole('link', { name: 'Asha Rao' });

    await userEvent.click(screen.getByRole('button', { name: 'Monthly salary' }));
    await waitFor(() =>
      expect(lastListQuery(calls)).toMatchObject({ sort: 'salary', order: 'asc' }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Monthly salary' }));
    await waitFor(() =>
      expect(lastListQuery(calls)).toMatchObject({ sort: 'salary', order: 'desc' }),
    );
    expect(screen.getByRole('columnheader', { name: 'Monthly salary' })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('moves between pages, and cannot go before the first', async () => {
    const calls = mockSignedInApi({
      'GET /employees': (_body, url) => ({
        body: aPage([ASHA], { total: 60, page: Number(url.searchParams.get('page')) }),
      }),
    });
    renderApp('/employees');
    await screen.findByText('Page 1 of 3');

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument();
    expect(lastListQuery(calls).page).toBe('2');
  });

  it('restores search, filters and sorting from the address', async () => {
    const calls = mockSignedInApi({ 'GET /employees': () => ({ body: aPage([ASHA]) }) });

    renderApp('/employees?search=rao&country=IN&sort=hireDate&order=desc');
    await screen.findByRole('link', { name: 'Asha Rao' });

    expect(lastListQuery(calls)).toMatchObject({
      search: 'rao',
      country: 'IN',
      sort: 'hireDate',
      order: 'desc',
    });
    expect(screen.getByRole('searchbox')).toHaveValue('rao');
    expect(screen.getByLabelText('Country')).toHaveValue('IN');
  });

  it('says so when nobody matches', async () => {
    mockSignedInApi({ 'GET /employees': () => ({ body: aPage([]) }) });

    renderApp('/employees?search=zzz');

    expect(
      await screen.findByText('No employees match your search and filters.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Showing 0–0 of 0')).toBeInTheDocument();
  });

  it('offers to try again when the list cannot be loaded', async () => {
    mockSignedInApi({
      'GET /employees': () => apiError(400, 'VALIDATION_ERROR', 'Some fields are invalid'),
    });

    renderApp('/employees');

    expect(await screen.findByText('We could not load the employees.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('adding an employee', () => {
  it('points out every field that is missing, without calling the server', async () => {
    const calls = mockSignedInApi({ 'GET /employees': () => ({ body: aPage([]) }) });
    renderApp('/employees');

    await userEvent.click(await screen.findByRole('button', { name: 'Add employee' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add employee' }));

    for (const message of [
      'Enter a name',
      'Enter an email address',
      'Enter a job title',
      'Choose a department',
      'Choose a level',
      'Choose a country',
      'Enter a hire date',
      'Enter a monthly salary',
    ]) {
      expect(await within(dialog).findByText(message)).toBeInTheDocument();
    }
    expect(calls.filter((call) => call.method === 'POST')).toEqual([]);
  });

  it('saves the employee and opens their page', async () => {
    const created = anEmployee({ id: 42, name: 'Chloe Tan', currencyCode: 'USD' });
    const calls = mockSignedInApi({
      'GET /employees': () => ({ body: aPage([]) }),
      'POST /employees': () => ({ status: 201, body: { employee: created } }),
      'GET /employees/42/salary-history': () => ({ body: { history: [] } }),
    });
    renderApp('/employees');

    await userEvent.click(await screen.findByRole('button', { name: 'Add employee' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.type(dialog.getByLabelText('Name'), 'Chloe Tan');
    await userEvent.type(dialog.getByLabelText('Email'), 'chloe.tan@example.com');
    await userEvent.type(dialog.getByLabelText('Job title'), 'Account Executive');
    await userEvent.selectOptions(dialog.getByLabelText('Department'), 'Sales');
    await userEvent.selectOptions(dialog.getByLabelText('Level'), 'Senior');
    await userEvent.selectOptions(dialog.getByLabelText('Country'), 'United States');
    await userEvent.type(dialog.getByLabelText('Hire date'), '2025-01-15');
    await userEvent.type(dialog.getByLabelText('Monthly salary (USD)'), '6500');
    await userEvent.click(dialog.getByRole('button', { name: 'Add employee' }));

    expect(await screen.findByRole('heading', { name: 'Chloe Tan' })).toBeInTheDocument();
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/employees',
      body: {
        name: 'Chloe Tan',
        email: 'chloe.tan@example.com',
        jobTitle: 'Account Executive',
        departmentId: 2,
        levelId: 2,
        countryCode: 'US',
        hireDate: '2025-01-15',
        salary: '6500',
      },
    });
  });

  it("puts the server's objection on the field it is about", async () => {
    mockSignedInApi({
      'GET /employees': () => ({ body: aPage([]) }),
      'POST /employees': () =>
        apiError(400, 'VALIDATION_ERROR', 'Some fields are invalid', {
          email: ['Another employee already has this email'],
        }),
    });
    renderApp('/employees');

    await userEvent.click(await screen.findByRole('button', { name: 'Add employee' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.type(dialog.getByLabelText('Name'), 'Chloe Tan');
    await userEvent.type(dialog.getByLabelText('Email'), 'asha.rao@example.com');
    await userEvent.type(dialog.getByLabelText('Job title'), 'Account Executive');
    await userEvent.selectOptions(dialog.getByLabelText('Department'), 'Sales');
    await userEvent.selectOptions(dialog.getByLabelText('Level'), 'Senior');
    await userEvent.selectOptions(dialog.getByLabelText('Country'), 'India');
    await userEvent.type(dialog.getByLabelText('Hire date'), '2025-01-15');
    await userEvent.type(dialog.getByLabelText('Monthly salary (INR)'), '90000');
    await userEvent.click(dialog.getByRole('button', { name: 'Add employee' }));

    expect(await dialog.findByText('Another employee already has this email')).toBeInTheDocument();
    expect(dialog.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});
