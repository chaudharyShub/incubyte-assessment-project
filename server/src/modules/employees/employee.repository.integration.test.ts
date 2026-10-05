import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { currentSalary } from '../../seed/generate-employees.js';
import { COUNTRIES, CURRENCIES } from '../../seed/reference-data.js';
import { aNewEmployee } from '../../test/fakes.js';
import { setUpIntegrationDatabase, type IntegrationDatabase } from '../../test/integration-db.js';
import { createEmployeeRepository, type EmployeeRepository } from './employee.repository.js';
import type { EmployeeListQuery } from './employee.types.js';

const ALL: EmployeeListQuery = { sort: 'name', order: 'asc', page: 1, pageSize: 100 };

function rateToInr(countryCode: string): number {
  const country = COUNTRIES.find((c) => c.code === countryCode)!;
  return Number(CURRENCIES.find((c) => c.code === country.currencyCode)!.rateToInr);
}

describe('employee repository (PostgreSQL)', () => {
  let db: IntegrationDatabase;
  let repository: EmployeeRepository;

  beforeAll(async () => {
    db = await setUpIntegrationDatabase();
    repository = createEmployeeRepository(db.pool);
  });

  afterAll(async () => {
    await db?.close();
  });

  const emailsOf = (items: { email: string }[]) => items.map((item) => item.email).sort();

  describe('list', () => {
    it('returns every employee when there are no filters', async () => {
      const { items, total } = await repository.list(ALL);

      expect(total).toBe(db.seeded.length);
      expect(emailsOf(items)).toEqual(emailsOf(db.seeded));
    });

    it('filters by country, department, level and status together', async () => {
      const expected = db.seeded.filter(
        (e) => e.countryCode === 'IN' && e.departmentId === 1 && e.status === 'active',
      );

      const { items, total } = await repository.list({
        ...ALL,
        country: 'IN',
        department: 1,
        status: 'active',
      });

      expect(expected.length).toBeGreaterThan(0);
      expect(total).toBe(expected.length);
      expect(emailsOf(items)).toEqual(emailsOf(expected));
    });

    it('searches name and email by any part, ignoring case', async () => {
      const term = db.seeded[0]!.name.slice(1, 4);
      const matches = (text: string) => text.toLowerCase().includes(term.toLowerCase());
      const expected = db.seeded.filter((e) => matches(e.name) || matches(e.email));

      const { items } = await repository.list({ ...ALL, search: term.toUpperCase() });

      expect(emailsOf(items)).toEqual(emailsOf(expected));
    });

    it('sorts by salary using the INR equivalent, not the raw local amount', async () => {
      const expected = db.seeded
        .map((e) => Number(currentSalary(e)) * rateToInr(e.countryCode))
        .sort((a, b) => b - a);

      const { items } = await repository.list({ ...ALL, sort: 'salary', order: 'desc' });

      expect(items.map((item) => Number(item.salaryInr))).toEqual(expected);
    });

    it('pages without repeating or skipping anyone', async () => {
      const first = await repository.list({ ...ALL, page: 1, pageSize: 25 });
      const second = await repository.list({ ...ALL, page: 2, pageSize: 25 });
      const third = await repository.list({ ...ALL, page: 3, pageSize: 25 });

      const seen = [...first.items, ...second.items, ...third.items].map((item) => item.id);
      expect(first.items).toHaveLength(25);
      expect(third.items).toHaveLength(db.seeded.length - 50);
      expect(new Set(seen).size).toBe(db.seeded.length);
      expect(second.total).toBe(db.seeded.length);
    });
  });

  describe('findById', () => {
    it('returns the employee with names, currency and INR equivalent filled in', async () => {
      const seeded = db.seeded.find((e) => e.countryCode === 'US')!;
      const { items } = await repository.list({ ...ALL, search: seeded.email });

      const employee = await repository.findById(items[0]!.id);

      expect(employee).toMatchObject({
        name: seeded.name,
        countryName: 'United States',
        hireDate: seeded.hireDate,
        salary: currentSalary(seeded),
        currencyCode: 'USD',
        salaryInr: (Number(currentSalary(seeded)) * 88).toFixed(2),
      });
    });

    it('returns null when there is no such employee', async () => {
      expect(await repository.findById(999_999)).toBeNull();
    });
  });

  describe('writes', () => {
    it('creates an employee together with their first salary record', async () => {
      const id = await repository.create(
        aNewEmployee({ email: 'created@example.com', countryCode: 'GB', salary: '4200.50' }),
      );

      expect(await repository.findById(id)).toMatchObject({
        email: 'created@example.com',
        status: 'active',
        salary: '4200.50',
        currencyCode: 'GBP',
      });
      expect(await repository.salaryHistory(id)).toMatchObject([
        { amount: '4200.50', currencyCode: 'GBP', effectiveDate: '2024-03-01' },
      ]);
    });

    it('appends a salary change and makes it the current salary', async () => {
      const id = await repository.create(aNewEmployee({ email: 'raise@example.com' }));

      await repository.addSalaryChange(id, { amount: '91000.00', effectiveDate: '2025-04-01' });

      expect((await repository.findById(id))!.salary).toBe('91000.00');
      expect(await repository.salaryHistory(id)).toMatchObject([
        { amount: '91000.00', effectiveDate: '2025-04-01' },
        { amount: '80000.00', effectiveDate: '2024-03-01' },
      ]);
    });

    it('updates only the fields it is given', async () => {
      const id = await repository.create(aNewEmployee({ email: 'update@example.com' }));

      await repository.update(id, { status: 'inactive', jobTitle: 'Staff Engineer' });

      expect(await repository.findById(id)).toMatchObject({
        name: 'Asha Rao',
        status: 'inactive',
        jobTitle: 'Staff Engineer',
      });
    });

    it('is stopped by the database from saving a duplicate email in another letter case', async () => {
      await repository.create(aNewEmployee({ email: 'unique@example.com' }));

      await expect(
        repository.create(aNewEmployee({ email: 'UNIQUE@example.com' })),
      ).rejects.toMatchObject({ constraint: 'employees_email_unique' });
    });
  });

  describe('emailInUse', () => {
    it('finds an email in any letter case, unless it belongs to the excepted employee', async () => {
      const id = await repository.create(aNewEmployee({ email: 'taken@example.com' }));

      expect(await repository.emailInUse('TAKEN@example.com')).toBe(true);
      expect(await repository.emailInUse('taken@example.com', id)).toBe(false);
      expect(await repository.emailInUse('free@example.com')).toBe(false);
    });
  });
});
