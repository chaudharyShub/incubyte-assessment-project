import type { Employee, EmployeePage, Meta } from '@/api/types';
import { mockApi, TEST_USER } from './render-app';

export const META: Meta = {
  countries: [
    { code: 'IN', name: 'India', currencyCode: 'INR' },
    { code: 'US', name: 'United States', currencyCode: 'USD' },
  ],
  departments: [
    { id: 1, name: 'Engineering' },
    { id: 2, name: 'Sales' },
  ],
  levels: [
    { id: 1, name: 'Junior' },
    { id: 2, name: 'Senior' },
  ],
};

/** A complete employee; override only the fields a test is about. */
export function anEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    name: 'Asha Rao',
    email: 'asha.rao@example.com',
    countryCode: 'IN',
    countryName: 'India',
    departmentId: 1,
    departmentName: 'Engineering',
    levelId: 1,
    levelName: 'Junior',
    jobTitle: 'Software Engineer',
    hireDate: '2024-03-01',
    status: 'active',
    salary: '80000.00',
    currencyCode: 'INR',
    salaryInr: '80000.00',
    ...overrides,
  };
}

export function aPage(items: Employee[], overrides: Partial<EmployeePage> = {}): EmployeePage {
  return { items, total: items.length, page: 1, pageSize: 25, ...overrides };
}

/** A fake API for a signed-in user: the session and reference data, plus the given handlers. */
export function mockSignedInApi(handlers: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /auth/me': () => ({ body: { user: TEST_USER } }),
    'GET /meta': () => ({ body: META }),
    ...handlers,
  });
}
