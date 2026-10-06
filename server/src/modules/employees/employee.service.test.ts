import { beforeEach, describe, expect, it } from 'vitest';
import {
  aNewEmployee,
  createFakeEmployeeRepository,
  createFakeMetaRepository,
} from '../../test/fakes.js';
import { createEmployeeService, latestToday, type EmployeeService } from './employee.service.js';

const NOW = new Date('2026-06-15T09:00:00Z');

async function validationErrors(action: Promise<unknown>) {
  const error = await action.then(
    () => {
      throw new Error('Expected the action to be rejected');
    },
    (rejection) => rejection,
  );
  expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
  return error.details as Record<string, string[]>;
}

describe('employee service', () => {
  let service: EmployeeService;

  beforeEach(() => {
    service = createEmployeeService({
      employees: createFakeEmployeeRepository(),
      meta: createFakeMetaRepository(),
      now: () => NOW,
    });
  });

  describe('create', () => {
    it('saves the employee as active, paid in the currency of their country', async () => {
      const employee = await service.create(aNewEmployee({ countryCode: 'US', salary: '5000.00' }));

      expect(employee).toMatchObject({
        name: 'Asha Rao',
        status: 'active',
        countryName: 'United States',
        salary: '5000.00',
        currencyCode: 'USD',
        salaryInr: '440000.00',
      });
    });

    it('starts the salary history with the starting salary on the hire date', async () => {
      const employee = await service.create(
        aNewEmployee({ hireDate: '2024-03-01', salary: '80000.00' }),
      );

      expect(await service.salaryHistory(employee.id)).toMatchObject([
        { amount: '80000.00', currencyCode: 'INR', effectiveDate: '2024-03-01' },
      ]);
    });

    it('rejects a country, department and level that do not exist, all at once', async () => {
      const errors = await validationErrors(
        service.create(aNewEmployee({ countryCode: 'ZZ', departmentId: 99, levelId: 99 })),
      );

      expect(errors).toEqual({
        countryCode: ['Choose a country from the list'],
        departmentId: ['Choose a department from the list'],
        levelId: ['Choose a level from the list'],
      });
    });

    it('rejects an email another employee already has, ignoring case', async () => {
      await service.create(aNewEmployee({ email: 'asha.rao@example.com' }));

      const errors = await validationErrors(
        service.create(aNewEmployee({ email: 'Asha.Rao@Example.com' })),
      );

      expect(errors).toEqual({ email: ['Another employee already has this email'] });
    });

    it('rejects a hire date in the future', async () => {
      const errors = await validationErrors(
        service.create(aNewEmployee({ hireDate: '2026-06-17' })),
      );

      expect(errors).toEqual({ hireDate: ['Hire date cannot be in the future'] });
    });

    it('accepts a hire date of today', async () => {
      const employee = await service.create(aNewEmployee({ hireDate: '2026-06-15' }));

      expect(employee.hireDate).toBe('2026-06-15');
    });
  });

  describe('get', () => {
    it('fails with 404 for an employee that does not exist', async () => {
      await expect(service.get(404)).rejects.toMatchObject({
        status: 404,
        code: 'EMPLOYEE_NOT_FOUND',
      });
    });
  });

  describe('list', () => {
    it('returns the matching employees with the paging that was asked for', async () => {
      await service.create(aNewEmployee());

      const page = await service.list({ sort: 'name', order: 'asc', page: 2, pageSize: 10 });

      expect(page).toMatchObject({ total: 1, page: 2, pageSize: 10 });
      expect(page.items).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('changes only the fields that were given', async () => {
      const { id } = await service.create(aNewEmployee());

      const updated = await service.update(id, { jobTitle: 'Staff Engineer', levelId: 2 });

      expect(updated).toMatchObject({
        name: 'Asha Rao',
        jobTitle: 'Staff Engineer',
        levelName: 'Senior',
      });
    });

    it('marks an employee inactive', async () => {
      const { id } = await service.create(aNewEmployee());

      const updated = await service.update(id, { status: 'inactive' });

      expect(updated.status).toBe('inactive');
    });

    it('lets an employee keep their own email', async () => {
      const { id, email } = await service.create(aNewEmployee());

      await expect(service.update(id, { email, name: 'Asha R.' })).resolves.toMatchObject({
        name: 'Asha R.',
      });
    });

    it("rejects another employee's email", async () => {
      await service.create(aNewEmployee({ email: 'first@example.com' }));
      const second = await service.create(aNewEmployee({ email: 'second@example.com' }));

      const errors = await validationErrors(
        service.update(second.id, { email: 'first@example.com' }),
      );

      expect(errors).toEqual({ email: ['Another employee already has this email'] });
    });

    it('rejects a department that does not exist', async () => {
      const { id } = await service.create(aNewEmployee());

      const errors = await validationErrors(service.update(id, { departmentId: 99 }));

      expect(errors).toEqual({ departmentId: ['Choose a department from the list'] });
    });

    it('fails with 404 for an employee that does not exist', async () => {
      await expect(service.update(404, { name: 'Nobody' })).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('changeSalary', () => {
    let id: number;

    beforeEach(async () => {
      ({ id } = await service.create(aNewEmployee({ hireDate: '2024-03-01', salary: '80000' })));
    });

    it('makes the new amount the current salary', async () => {
      const employee = await service.changeSalary(id, {
        amount: '90000.00',
        effectiveDate: '2025-04-01',
      });

      expect(employee).toMatchObject({ salary: '90000.00', salaryInr: '90000.00' });
    });

    it('keeps the earlier salary in the history, newest first', async () => {
      await service.changeSalary(id, { amount: '90000.00', effectiveDate: '2025-04-01' });

      expect(await service.salaryHistory(id)).toMatchObject([
        { amount: '90000.00', effectiveDate: '2025-04-01' },
        { amount: '80000.00', effectiveDate: '2024-03-01' },
      ]);
    });

    it('allows a pay cut', async () => {
      const employee = await service.changeSalary(id, {
        amount: '70000.00',
        effectiveDate: '2025-04-01',
      });

      expect(employee.salary).toBe('70000.00');
    });

    it('rejects an effective date in the future', async () => {
      const errors = await validationErrors(
        service.changeSalary(id, { amount: '90000.00', effectiveDate: '2026-06-17' }),
      );

      expect(errors).toEqual({ effectiveDate: ['Effective date cannot be in the future'] });
    });

    it.each(['2024-03-01', '2024-02-29'])(
      'rejects an effective date of %s, which is not after the previous change',
      async (effectiveDate) => {
        const errors = await validationErrors(
          service.changeSalary(id, { amount: '90000.00', effectiveDate }),
        );

        expect(errors).toEqual({
          effectiveDate: ['Effective date must be after the previous change on 2024-03-01'],
        });
      },
    );

    it('rejects an amount equal to the current salary', async () => {
      const errors = await validationErrors(
        service.changeSalary(id, { amount: '80000', effectiveDate: '2025-04-01' }),
      );

      expect(errors).toEqual({ amount: ['New salary is the same as the current salary'] });
    });

    it('leaves the salary and history untouched when the change is rejected', async () => {
      await service
        .changeSalary(id, { amount: '90000.00', effectiveDate: '2020-01-01' })
        .catch(() => {});

      expect((await service.get(id)).salary).toBe('80000.00');
      expect(await service.salaryHistory(id)).toHaveLength(1);
    });

    it('refuses to change the salary of an inactive employee', async () => {
      await service.update(id, { status: 'inactive' });

      await expect(
        service.changeSalary(id, { amount: '90000.00', effectiveDate: '2025-04-01' }),
      ).rejects.toMatchObject({ status: 409, code: 'EMPLOYEE_INACTIVE' });
    });

    it('fails with 404 for an employee that does not exist', async () => {
      await expect(
        service.changeSalary(404, { amount: '90000.00', effectiveDate: '2025-04-01' }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});

describe('employee service: peer comparison', () => {
  let service: EmployeeService;
  let nextPeer = 1;

  beforeEach(() => {
    service = createEmployeeService({
      employees: createFakeEmployeeRepository(),
      meta: createFakeMetaRepository(),
      now: () => NOW,
    });
  });

  /** Adds one employee per salary, all in the same country and level unless overridden. */
  async function addPeers(salaries: string[], overrides: Parameters<typeof aNewEmployee>[0] = {}) {
    const added = [];
    for (const salary of salaries) {
      const email = `peer${nextPeer++}@example.com`;
      added.push(await service.create(aNewEmployee({ salary, email, ...overrides })));
    }
    return added;
  }

  it('compares the salary with the median, lowest and highest among peers', async () => {
    const [lowest] = await addPeers(['60000', '80000', '100000', '120000', '140000']);

    expect(await service.peerComparison(lowest!.id)).toEqual({
      peerCount: 5,
      median: '100000.00',
      min: '60000.00',
      max: '140000.00',
      currencyCode: 'INR',
      differenceFromMedianPercent: -40,
    });
  });

  it('reports a salary above the median as a positive difference, to one decimal place', async () => {
    const peers = await addPeers(['60000', '80000', '90000', '100000', '103333']);

    const comparison = await service.peerComparison(peers.at(-1)!.id);

    expect(comparison!.differenceFromMedianPercent).toBe(14.8);
  });

  it('counts only active employees in the same country and level as peers', async () => {
    const [employee] = await addPeers(['60000', '80000', '100000', '120000', '140000']);
    await addPeers(['900000'], { levelId: 2 });
    await addPeers(['5000'], { countryCode: 'US' });
    const [leaver] = await addPeers(['700000']);
    await service.update(leaver!.id, { status: 'inactive' });

    expect(await service.peerComparison(employee!.id)).toMatchObject({
      peerCount: 5,
      max: '140000.00',
    });
  });

  it('gives no comparison when there are too few peers for a median to mean much', async () => {
    const [employee] = await addPeers(['60000', '80000', '100000', '120000']);

    expect(await service.peerComparison(employee!.id)).toBeNull();
  });

  it('gives no comparison for an inactive employee', async () => {
    const [employee] = await addPeers(['60000', '80000', '100000', '120000', '140000', '160000']);
    await service.update(employee!.id, { status: 'inactive' });

    expect(await service.peerComparison(employee!.id)).toBeNull();
  });

  it('fails with 404 for an employee that does not exist', async () => {
    await expect(service.peerComparison(999)).rejects.toMatchObject({ status: 404 });
  });
});

describe('latestToday', () => {
  it('is the UTC date for most of the day', () => {
    expect(latestToday(new Date('2026-06-15T09:00:00Z'))).toBe('2026-06-15');
  });

  it('is already tomorrow once the day has turned in the furthest-ahead timezone', () => {
    expect(latestToday(new Date('2026-06-15T10:00:00Z'))).toBe('2026-06-16');
  });
});
