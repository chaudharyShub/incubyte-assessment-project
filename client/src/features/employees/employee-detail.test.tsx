import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Employee, SalaryRecord } from '@/api/types';
import { anEmployee, mockSignedInApi } from '@/test/fixtures';
import { apiError, renderApp } from '@/test/render-app';

const BEN = anEmployee({
  id: 7,
  name: 'Ben Carter',
  email: 'ben.carter@example.com',
  countryCode: 'US',
  countryName: 'United States',
  hireDate: '2023-02-01',
  salary: '5500.00',
  currencyCode: 'USD',
  salaryInr: '484000.00',
});

const HISTORY: SalaryRecord[] = [
  { id: 2, amount: '5500.00', currencyCode: 'USD', effectiveDate: '2024-04-01' },
  { id: 1, amount: '5000.00', currencyCode: 'USD', effectiveDate: '2023-02-01' },
];

/** A fake API holding one employee, which its write handlers update like the server would. */
function mockEmployeeApi(
  initial: Employee = BEN,
  extra: Parameters<typeof mockSignedInApi>[0] = {},
) {
  let employee = initial;
  let history = [...HISTORY];
  return mockSignedInApi({
    'GET /employees/7': () => ({ body: { employee } }),
    'GET /employees/7/salary-history': () => ({ body: { history } }),
    'PATCH /employees/7': (body) => {
      employee = { ...employee, ...(body as Partial<Employee>) };
      return { body: { employee } };
    },
    'POST /employees/7/salary': (body) => {
      const { amount, effectiveDate } = body as { amount: string; effectiveDate: string };
      employee = { ...employee, salary: Number(amount).toFixed(2) };
      history = [
        { id: 3, amount: employee.salary, currencyCode: 'USD', effectiveDate },
        ...history,
      ];
      return { status: 201, body: { employee } };
    },
    ...extra,
  });
}

describe('employee page', () => {
  it('shows the details, the current salary and its INR equivalent', async () => {
    mockEmployeeApi();

    renderApp('/employees/7');

    expect(await screen.findByRole('heading', { name: 'Ben Carter' })).toBeInTheDocument();
    expect(screen.getByText('ben.carter@example.com')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('Hire date').nextSibling).toHaveTextContent('1 Feb 2023');
    expect(screen.getByText('about ₹4,84,000')).toBeInTheDocument();
  });

  it('lists the salary history newest first and marks the current one', async () => {
    mockEmployeeApi();

    renderApp('/employees/7');

    const [, current, earlier] = await screen.findAllByRole('row');
    expect(current).toHaveTextContent('1 Apr 2024');
    expect(current).toHaveTextContent('Current');
    expect(current).toHaveTextContent('$5,500');
    expect(earlier).toHaveTextContent('1 Feb 2023');
    expect(earlier).toHaveTextContent('$5,000');
    expect(earlier).not.toHaveTextContent('Current');
  });

  it('says so when the employee does not exist', async () => {
    mockSignedInApi({
      'GET /employees/999': () => apiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found'),
      'GET /employees/999/salary-history': () =>
        apiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found'),
    });

    renderApp('/employees/999');

    expect(await screen.findByText('This employee does not exist.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← All employees' })).toBeInTheDocument();
  });
});

describe('changing a salary', () => {
  it('records the new salary and shows it at the top of the history', async () => {
    const calls = mockEmployeeApi();
    renderApp('/employees/7');

    await userEvent.click(await screen.findByRole('button', { name: 'Change salary' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText(/currently earns \$5,500 a month/)).toBeInTheDocument();

    await userEvent.type(dialog.getByLabelText('New monthly salary (USD)'), '6000');
    await userEvent.clear(dialog.getByLabelText('Effective date'));
    await userEvent.type(dialog.getByLabelText('Effective date'), '2025-04-01');
    await userEvent.click(dialog.getByRole('button', { name: 'Save new salary' }));

    const [, current] = await screen.findAllByRole('row');
    expect(await screen.findByText('1 Apr 2025')).toBeInTheDocument();
    expect(current).toHaveTextContent('$6,000');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(calls).toContainEqual({
      method: 'POST',
      path: '/employees/7/salary',
      body: { amount: '6000', effectiveDate: '2025-04-01' },
    });
  });

  it.each(['0', 'abc', '100.555'])('rejects an amount of "%s" before saving', async (amount) => {
    const calls = mockEmployeeApi();
    renderApp('/employees/7');

    await userEvent.click(await screen.findByRole('button', { name: 'Change salary' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.type(dialog.getByLabelText('New monthly salary (USD)'), amount);
    await userEvent.click(dialog.getByRole('button', { name: 'Save new salary' }));

    expect(
      await dialog.findByText('Enter an amount greater than zero, with at most 2 decimal places'),
    ).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'POST')).toEqual([]);
  });

  it("shows the server's reason on the date when it rejects the change", async () => {
    mockEmployeeApi(BEN, {
      'POST /employees/7/salary': () =>
        apiError(400, 'VALIDATION_ERROR', 'Some fields are invalid', {
          effectiveDate: ['Effective date must be after the previous change on 2024-04-01'],
        }),
    });
    renderApp('/employees/7');

    await userEvent.click(await screen.findByRole('button', { name: 'Change salary' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.type(dialog.getByLabelText('New monthly salary (USD)'), '6000');
    await userEvent.clear(dialog.getByLabelText('Effective date'));
    await userEvent.type(dialog.getByLabelText('Effective date'), '2024-01-01');
    await userEvent.click(dialog.getByRole('button', { name: 'Save new salary' }));

    expect(
      await dialog.findByText('Effective date must be after the previous change on 2024-04-01'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('is not offered for an inactive employee', async () => {
    mockEmployeeApi({ ...BEN, status: 'inactive' });

    renderApp('/employees/7');

    expect(await screen.findByRole('button', { name: 'Change salary' })).toBeDisabled();
  });
});

describe('editing an employee', () => {
  it('starts from the current details and saves the changes', async () => {
    const calls = mockEmployeeApi();
    renderApp('/employees/7');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByLabelText('Name')).toHaveValue('Ben Carter');
    expect(dialog.queryByLabelText('Country')).not.toBeInTheDocument();
    expect(dialog.queryByLabelText(/Monthly salary/)).not.toBeInTheDocument();

    await userEvent.clear(dialog.getByLabelText('Job title'));
    await userEvent.type(dialog.getByLabelText('Job title'), 'Staff Engineer');
    await userEvent.click(dialog.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Staff Engineer')).toBeInTheDocument();
    expect(calls).toContainEqual({
      method: 'PATCH',
      path: '/employees/7',
      body: {
        name: 'Ben Carter',
        email: 'ben.carter@example.com',
        jobTitle: 'Staff Engineer',
        departmentId: 1,
        levelId: 1,
      },
    });
  });
});

describe('marking an employee inactive', () => {
  it('asks for confirmation, then updates the status', async () => {
    const calls = mockEmployeeApi();
    renderApp('/employees/7');

    await userEvent.click(await screen.findByRole('button', { name: 'Mark inactive' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByRole('heading', { name: 'Mark Ben Carter inactive?' })).toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'PATCH')).toEqual([]);

    await userEvent.click(dialog.getByRole('button', { name: 'Mark inactive' }));

    expect(await screen.findByText('Inactive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark active' })).toBeInTheDocument();
    expect(calls).toContainEqual({
      method: 'PATCH',
      path: '/employees/7',
      body: { status: 'inactive' },
    });
  });

  it('does nothing when the confirmation is cancelled', async () => {
    const calls = mockEmployeeApi();
    renderApp('/employees/7');

    await userEvent.click(await screen.findByRole('button', { name: 'Mark inactive' }));
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(calls.filter((call) => call.method === 'PATCH')).toEqual([]);
  });
});
