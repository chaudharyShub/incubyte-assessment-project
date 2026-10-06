import type pg from 'pg';
import { buildEmployeeListQuery, EMPLOYEE_SELECT } from './employee-list-query.js';
import type {
  Employee,
  EmployeeChanges,
  EmployeeListQuery,
  NewEmployee,
  PeerSalaryStats,
  SalaryChange,
  SalaryRecord,
} from './employee.types.js';

export interface EmployeeRepository {
  list(query: EmployeeListQuery): Promise<{ items: Employee[]; total: number }>;
  findById(id: number): Promise<Employee | null>;
  /** True if an employee other than `exceptId` already has this email, ignoring case. */
  emailInUse(email: string, exceptId?: number): Promise<boolean>;
  /** Saves the employee together with their first salary record. Returns the new id. */
  create(employee: NewEmployee): Promise<number>;
  update(id: number, changes: EmployeeChanges): Promise<void>;
  /** Newest first. */
  salaryHistory(employeeId: number): Promise<SalaryRecord[]>;
  /** Appends a salary record and makes it the employee's current salary. */
  addSalaryChange(employeeId: number, change: SalaryChange): Promise<void>;
  /** Salary statistics for the active employees in a country and level, or null if there are none. */
  peerSalaryStats(countryCode: string, levelId: number): Promise<PeerSalaryStats | null>;
}

const UPDATABLE_COLUMNS: Record<keyof EmployeeChanges, string> = {
  name: 'name',
  email: 'email',
  departmentId: 'department_id',
  levelId: 'level_id',
  jobTitle: 'job_title',
  status: 'status',
};

export function createEmployeeRepository(pool: pg.Pool): EmployeeRepository {
  return {
    async list(query) {
      const { rows, count } = buildEmployeeListQuery(query);
      const [page, total] = await Promise.all([
        pool.query<Employee>(rows.text, rows.values),
        pool.query<{ total: number }>(count.text, count.values),
      ]);
      return { items: page.rows, total: total.rows[0]!.total };
    },

    async findById(id) {
      const { rows } = await pool.query<Employee>(`${EMPLOYEE_SELECT} WHERE e.id = $1`, [id]);
      return rows[0] ?? null;
    },

    async emailInUse(email, exceptId) {
      const { rows } = await pool.query(
        `SELECT 1 FROM employees
         WHERE lower(email) = lower($1) AND ($2::int IS NULL OR id <> $2)`,
        [email, exceptId ?? null],
      );
      return rows.length > 0;
    },

    // One statement, so the employee and their first salary record are saved
    // together or not at all.
    async create(employee) {
      const { rows } = await pool.query<{ id: number }>(
        `WITH new_employee AS (
           INSERT INTO employees
             (name, email, country_code, department_id, level_id, job_title, hire_date, salary)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, country_code, salary, hire_date
         )
         INSERT INTO salary_history (employee_id, amount, currency_code, effective_date)
         SELECT ne.id, ne.salary, co.currency_code, ne.hire_date
         FROM new_employee ne
         JOIN countries co ON co.code = ne.country_code
         RETURNING employee_id AS id`,
        [
          employee.name,
          employee.email,
          employee.countryCode,
          employee.departmentId,
          employee.levelId,
          employee.jobTitle,
          employee.hireDate,
          employee.salary,
        ],
      );
      return rows[0]!.id;
    },

    async update(id, changes) {
      const fields = (Object.keys(UPDATABLE_COLUMNS) as (keyof EmployeeChanges)[]).filter(
        (field) => changes[field] !== undefined,
      );
      if (fields.length === 0) return;

      // Column names come from the fixed map above, never from the request.
      const assignments = fields.map((field, i) => `${UPDATABLE_COLUMNS[field]} = $${i + 2}`);
      await pool.query(
        `UPDATE employees SET ${assignments.join(', ')}, updated_at = now() WHERE id = $1`,
        [id, ...fields.map((field) => changes[field])],
      );
    },

    async salaryHistory(employeeId) {
      const { rows } = await pool.query<SalaryRecord>(
        `SELECT id, amount, currency_code AS "currencyCode", effective_date AS "effectiveDate"
         FROM salary_history
         WHERE employee_id = $1
         ORDER BY effective_date DESC`,
        [employeeId],
      );
      return rows;
    },

    // One statement, so the history and the current salary cannot disagree.
    async addSalaryChange(employeeId, change) {
      await pool.query(
        `WITH new_record AS (
           INSERT INTO salary_history (employee_id, amount, currency_code, effective_date)
           SELECT e.id, $2, co.currency_code, $3
           FROM employees e
           JOIN countries co ON co.code = e.country_code
           WHERE e.id = $1
           RETURNING employee_id, amount
         )
         UPDATE employees e
         SET salary = new_record.amount, updated_at = now()
         FROM new_record
         WHERE e.id = new_record.employee_id`,
        [employeeId, change.amount, change.effectiveDate],
      );
    },

    // Everyone in a country is paid in the same currency, so no conversion is needed.
    async peerSalaryStats(countryCode, levelId) {
      const { rows } = await pool.query<PeerSalaryStats>(
        `SELECT count(*)::int AS "peerCount",
                round((percentile_cont(0.5) WITHIN GROUP (ORDER BY salary))::numeric, 2) AS median,
                min(salary) AS min,
                max(salary) AS max
         FROM employees
         WHERE status = 'active' AND country_code = $1 AND level_id = $2`,
        [countryCode, levelId],
      );
      const stats = rows[0]!;
      return stats.peerCount > 0 ? stats : null;
    },
  };
}
