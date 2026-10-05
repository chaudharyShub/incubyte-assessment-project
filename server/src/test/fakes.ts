import type { AuthRepository, UserRecord } from '../modules/auth/auth.repository.js';
import type { EmployeeRepository } from '../modules/employees/employee.repository.js';
import type {
  Employee,
  EmployeeListQuery,
  EmployeeStatus,
  NewEmployee,
  SalaryRecord,
} from '../modules/employees/employee.types.js';
import type {
  InsightsGroupBy,
  InsightsRepository,
  InsightsSummary,
  SalaryStatsGroup,
} from '../modules/insights/insights.repository.js';
import type { Meta, MetaRepository } from '../modules/meta/meta.repository.js';

/** An AuthRepository backed by an array, for tests that must not touch a database. */
export function createFakeAuthRepository(users: UserRecord[] = []): AuthRepository {
  return {
    async findUserByEmail(email) {
      return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
    },
  };
}

export const TEST_META: Meta = {
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

const TEST_RATES_TO_INR: Record<string, number> = { INR: 1, USD: 88 };

export function createFakeMetaRepository(meta: Meta = TEST_META): MetaRepository {
  return {
    async getMeta() {
      return meta;
    },
  };
}

/** A valid new employee; override only the fields a test is about. */
export function aNewEmployee(overrides: Partial<NewEmployee> = {}): NewEmployee {
  return {
    name: 'Asha Rao',
    email: 'asha.rao@example.com',
    countryCode: 'IN',
    departmentId: 1,
    levelId: 1,
    jobTitle: 'Software Engineer',
    hireDate: '2024-03-01',
    salary: '80000.00',
    ...overrides,
  };
}

export interface FakeEmployeeRepository extends EmployeeRepository {
  /** Every query `list` was called with, oldest first. */
  listQueries: EmployeeListQuery[];
}

/**
 * An EmployeeRepository that keeps employees in memory. It stores and returns
 * data faithfully but does not filter, sort or page `list`: that is SQL, and is
 * covered by the integration tests against a real database.
 */
export function createFakeEmployeeRepository(): FakeEmployeeRepository {
  type Stored = NewEmployee & { id: number; status: EmployeeStatus };
  const employees = new Map<number, Stored>();
  const history = new Map<number, SalaryRecord[]>();
  const listQueries: EmployeeListQuery[] = [];
  let nextEmployeeId = 1;
  let nextRecordId = 1;

  const currencyOf = (countryCode: string) =>
    TEST_META.countries.find((country) => country.code === countryCode)!.currencyCode;

  function toEmployee(stored: Stored): Employee {
    const currencyCode = currencyOf(stored.countryCode);
    return {
      id: stored.id,
      name: stored.name,
      email: stored.email,
      countryCode: stored.countryCode,
      countryName: TEST_META.countries.find((c) => c.code === stored.countryCode)!.name,
      departmentId: stored.departmentId,
      departmentName: TEST_META.departments.find((d) => d.id === stored.departmentId)!.name,
      levelId: stored.levelId,
      levelName: TEST_META.levels.find((l) => l.id === stored.levelId)!.name,
      jobTitle: stored.jobTitle,
      hireDate: stored.hireDate,
      status: stored.status,
      salary: Number(stored.salary).toFixed(2),
      currencyCode,
      salaryInr: (Number(stored.salary) * TEST_RATES_TO_INR[currencyCode]!).toFixed(2),
    };
  }

  function addRecord(employeeId: number, amount: string, effectiveDate: string) {
    const stored = employees.get(employeeId)!;
    const records = history.get(employeeId) ?? [];
    records.unshift({
      id: nextRecordId++,
      amount: Number(amount).toFixed(2),
      currencyCode: currencyOf(stored.countryCode),
      effectiveDate,
    });
    history.set(employeeId, records);
  }

  return {
    listQueries,

    async list(query) {
      listQueries.push(query);
      const items = [...employees.values()].map(toEmployee);
      return { items, total: items.length };
    },

    async findById(id) {
      const stored = employees.get(id);
      return stored ? toEmployee(stored) : null;
    },

    async emailInUse(email, exceptId) {
      return [...employees.values()].some(
        (e) => e.email.toLowerCase() === email.toLowerCase() && e.id !== exceptId,
      );
    },

    async create(employee) {
      const id = nextEmployeeId++;
      employees.set(id, { ...employee, id, status: 'active' });
      addRecord(id, employee.salary, employee.hireDate);
      return id;
    },

    async update(id, changes) {
      Object.assign(employees.get(id)!, changes);
    },

    async salaryHistory(employeeId) {
      return [...(history.get(employeeId) ?? [])];
    },

    async addSalaryChange(employeeId, change) {
      addRecord(employeeId, change.amount, change.effectiveDate);
      employees.get(employeeId)!.salary = change.amount;
    },
  };
}

/** An InsightsRepository that returns the figures it is given. The arithmetic is SQL, covered by the integration tests. */
export function createFakeInsightsRepository(
  summary: InsightsSummary = { headcount: 0, totalPayrollInr: '0.00' },
  stats: Partial<Record<InsightsGroupBy, SalaryStatsGroup[]>> = {},
): InsightsRepository {
  return {
    async summary() {
      return summary;
    },
    async salaryStats(groupBy) {
      return stats[groupBy] ?? [];
    },
  };
}
