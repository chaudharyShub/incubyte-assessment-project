import { AppError } from '../../middleware/errors.js';
import type { MetaRepository } from '../meta/meta.repository.js';
import type { EmployeeRepository } from './employee.repository.js';
import type {
  Employee,
  EmployeeChanges,
  EmployeeListQuery,
  EmployeePage,
  NewEmployee,
  PeerComparison,
  SalaryChange,
  SalaryRecord,
} from './employee.types.js';

export interface EmployeeService {
  list(query: EmployeeListQuery): Promise<EmployeePage>;
  get(id: number): Promise<Employee>;
  create(employee: NewEmployee): Promise<Employee>;
  update(id: number, changes: EmployeeChanges): Promise<Employee>;
  salaryHistory(id: number): Promise<SalaryRecord[]>;
  changeSalary(id: number, change: SalaryChange): Promise<Employee>;
  /** Null when a comparison would not mean much: the employee is inactive, or has too few peers. */
  peerComparison(id: number): Promise<PeerComparison | null>;
}

export interface EmployeeServiceDependencies {
  employees: EmployeeRepository;
  meta: MetaRepository;
  /** The current time. Injected so tests can pin "today". */
  now: () => Date;
}

type FieldErrors = Record<string, string[]>;

const HOURS_AHEAD_OF_UTC = 14;

/** Below this many people, a median says more about individuals than about the group. */
export const MIN_PEER_GROUP_SIZE = 5;

/**
 * The latest calendar date that is "today" anywhere in the world. The server
 * runs in UTC and does not know the HR Manager's timezone, so a date is only
 * called "in the future" when it is in the future everywhere.
 */
export function latestToday(now: Date): string {
  return new Date(now.getTime() + HOURS_AHEAD_OF_UTC * 3_600_000).toISOString().slice(0, 10);
}

function throwIfInvalid(errors: FieldErrors): void {
  if (Object.keys(errors).length > 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', errors);
  }
}

export function createEmployeeService({
  employees,
  meta,
  now,
}: EmployeeServiceDependencies): EmployeeService {
  async function get(id: number): Promise<Employee> {
    const employee = await employees.findById(id);
    if (!employee) throw new AppError(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    return employee;
  }

  /** Checks the fields that must refer to something that exists, or be unused. */
  async function checkReferences(
    fields: { countryCode?: string; departmentId?: number; levelId?: number; email?: string },
    exceptId?: number,
  ): Promise<FieldErrors> {
    const errors: FieldErrors = {};
    const { countries, departments, levels } = await meta.getMeta();

    if (fields.countryCode && !countries.some((c) => c.code === fields.countryCode)) {
      errors.countryCode = ['Choose a country from the list'];
    }
    if (fields.departmentId && !departments.some((d) => d.id === fields.departmentId)) {
      errors.departmentId = ['Choose a department from the list'];
    }
    if (fields.levelId && !levels.some((l) => l.id === fields.levelId)) {
      errors.levelId = ['Choose a level from the list'];
    }
    if (fields.email && (await employees.emailInUse(fields.email, exceptId))) {
      errors.email = ['Another employee already has this email'];
    }
    return errors;
  }

  return {
    get,

    async list(query) {
      const { items, total } = await employees.list(query);
      return { items, total, page: query.page, pageSize: query.pageSize };
    },

    async create(employee) {
      const errors = await checkReferences(employee);
      if (employee.hireDate > latestToday(now())) {
        errors.hireDate = ['Hire date cannot be in the future'];
      }
      throwIfInvalid(errors);

      return get(await employees.create(employee));
    },

    async update(id, changes) {
      await get(id);
      throwIfInvalid(await checkReferences(changes, id));

      await employees.update(id, changes);
      return get(id);
    },

    async salaryHistory(id) {
      await get(id);
      return employees.salaryHistory(id);
    },

    async changeSalary(id, change) {
      const employee = await get(id);
      if (employee.status === 'inactive') {
        throw new AppError(
          409,
          'EMPLOYEE_INACTIVE',
          'The salary of an inactive employee cannot be changed',
        );
      }

      const errors: FieldErrors = {};
      const [latest] = await employees.salaryHistory(id);

      if (change.effectiveDate > latestToday(now())) {
        errors.effectiveDate = ['Effective date cannot be in the future'];
      } else if (latest && change.effectiveDate <= latest.effectiveDate) {
        // Keeps the newest record the current salary, with no reordering of history.
        errors.effectiveDate = [
          `Effective date must be after the previous change on ${latest.effectiveDate}`,
        ];
      }
      if (Number(change.amount) === Number(employee.salary)) {
        errors.amount = ['New salary is the same as the current salary'];
      }
      throwIfInvalid(errors);

      await employees.addSalaryChange(id, change);
      return get(id);
    },

    async peerComparison(id) {
      const employee = await get(id);
      if (employee.status === 'inactive') return null;

      const stats = await employees.peerSalaryStats(employee.countryCode, employee.levelId);
      if (!stats || stats.peerCount < MIN_PEER_GROUP_SIZE) return null;

      const median = Number(stats.median);
      return {
        ...stats,
        currencyCode: employee.currencyCode,
        differenceFromMedianPercent:
          Math.round(((Number(employee.salary) - median) / median) * 1000) / 10,
      };
    },
  };
}
