import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockSignedInApi } from '@/test/fixtures';
import { apiError, renderApp } from '@/test/render-app';
import type { SalaryStatsGroup } from './api';
// The app loads this page lazily. Importing it here first means the tests never
// wait on that download, so their timing does not depend on it.
import './InsightsPage';

const BY_COUNTRY: SalaryStatsGroup[] = [
  {
    key: 'IN',
    label: 'India',
    headcount: 4093,
    averageInr: '106159.25',
    medianInr: '86500.00',
    minInr: '30000.00',
    maxInr: '350000.00',
  },
  {
    key: 'US',
    label: 'United States',
    headcount: 2336,
    averageInr: '749228.00',
    medianInr: '686400.00',
    minInr: '396000.00',
    maxInr: '1584000.00',
  },
];

const BY_LEVEL: SalaryStatsGroup[] = [
  { ...BY_COUNTRY[0]!, key: '1', label: 'Junior' },
  { ...BY_COUNTRY[1]!, key: '4', label: 'Manager' },
];

function mockInsightsApi(overrides: Parameters<typeof mockSignedInApi>[0] = {}) {
  return mockSignedInApi({
    'GET /insights/summary': () => ({
      body: { headcount: 9218, totalPayrollInr: '3748093400.00' },
    }),
    'GET /insights/salary-stats': (_body, url) => ({
      body: {
        groups: url.searchParams.get('groupBy') === 'level' ? BY_LEVEL : BY_COUNTRY,
      },
    }),
    ...overrides,
  });
}

describe('insights page', () => {
  it('leads with the headcount and total monthly payroll', async () => {
    mockInsightsApi();

    renderApp('/insights');

    expect(await screen.findByText('9,218')).toBeInTheDocument();
    expect(screen.getByText('₹374.81Cr')).toBeInTheDocument();
    expect(screen.getByText('₹3,74,80,93,400')).toBeInTheDocument();
  });

  it('says that the figures cover active employees and are in INR', async () => {
    mockInsightsApi();

    renderApp('/insights');

    expect(
      await screen.findByText(
        'Active employees only. Monthly salaries, converted to INR at fixed exchange rates.',
      ),
    ).toBeInTheDocument();
  });

  it('asks for statistics by country, by department and by level', async () => {
    const calls = mockInsightsApi();

    renderApp('/insights');
    await screen.findByRole('table', { name: 'Salary by level' });

    const requested = calls
      .filter((call) => call.path.startsWith('/insights/salary-stats'))
      .map((call) => call.path.split('groupBy=')[1]);
    expect(requested.sort()).toEqual(['country', 'department', 'level']);
  });

  it('tabulates headcount, average, median, lowest and highest for each group', async () => {
    mockInsightsApi();

    renderApp('/insights');

    const table = await screen.findByRole('table', { name: 'Salary by country' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual(['country', 'Headcount', 'Average', 'Median', 'Lowest', 'Highest']);

    const india = within(table).getByRole('row', { name: /India/ });
    expect(
      within(india)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['India', '4,093', '₹1,06,159', '₹86,500', '₹30,000', '₹3,50,000']);
  });

  it('keeps the order the server gives, so levels read from junior to senior', async () => {
    mockInsightsApi();

    renderApp('/insights');

    const table = await screen.findByRole('table', { name: 'Salary by level' });
    const [, first, second] = within(table).getAllByRole('row');
    expect(first).toHaveTextContent('Junior');
    expect(second).toHaveTextContent('Manager');
  });

  it('shows the other sections when one of them cannot be loaded', async () => {
    mockInsightsApi({
      'GET /insights/summary': () => apiError(400, 'BAD_REQUEST', 'Bad request'),
    });

    renderApp('/insights');

    expect(
      await screen.findByText('We could not load the headcount and payroll.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Salary by country' })).toBeInTheDocument();
  });

  it('says so when there are no active employees', async () => {
    mockInsightsApi({
      'GET /insights/summary': () => ({ body: { headcount: 0, totalPayrollInr: '0.00' } }),
      'GET /insights/salary-stats': () => ({ body: { groups: [] } }),
    });

    renderApp('/insights');

    expect(await screen.findAllByText('There are no active employees.')).toHaveLength(3);
    // Once as the headline figure and once written out in full beneath it.
    expect(screen.getAllByText('₹0')).toHaveLength(2);
  });
});
