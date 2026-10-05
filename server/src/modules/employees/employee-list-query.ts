import type { EmployeeListQuery } from './employee.types.js';

export interface SqlQuery {
  text: string;
  values: unknown[];
}

/** Columns and joins shared by every query that returns an `Employee`. */
export const EMPLOYEE_SELECT = `
  SELECT e.id, e.name, e.email,
         e.country_code AS "countryCode", co.name AS "countryName",
         e.department_id AS "departmentId", d.name AS "departmentName",
         e.level_id AS "levelId", l.name AS "levelName",
         e.job_title AS "jobTitle", e.hire_date AS "hireDate", e.status,
         e.salary, co.currency_code AS "currencyCode",
         round(e.salary * cu.rate_to_inr, 2) AS "salaryInr"
  FROM employees e
  JOIN countries co ON co.code = e.country_code
  JOIN currencies cu ON cu.code = co.currency_code
  JOIN departments d ON d.id = e.department_id
  JOIN levels l ON l.id = e.level_id`;

// The only SQL a `sort` value can turn into. Salaries are in different
// currencies, so they are ordered by their INR equivalent.
const SORT_EXPRESSIONS: Record<EmployeeListQuery['sort'], string> = {
  name: 'e.name',
  hireDate: 'e.hire_date',
  salary: 'e.salary * cu.rate_to_inr',
};

/** Makes `%`, `_` and `\` in a search term match themselves instead of acting as wildcards. */
function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

/**
 * Builds the two queries behind the employee list: one page of rows, and the
 * number of rows that match the filters. Every user-supplied value is passed
 * as a parameter; nothing from the request is placed into the SQL text.
 */
export function buildEmployeeListQuery(query: EmployeeListQuery): {
  rows: SqlQuery;
  count: SqlQuery;
} {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const param = (value: unknown) => `$${values.push(value)}`;

  if (query.search) {
    const pattern = param(`%${escapeLike(query.search)}%`);
    conditions.push(`(e.name ILIKE ${pattern} OR e.email ILIKE ${pattern})`);
  }
  if (query.country) conditions.push(`e.country_code = ${param(query.country)}`);
  if (query.department) conditions.push(`e.department_id = ${param(query.department)}`);
  if (query.level) conditions.push(`e.level_id = ${param(query.level)}`);
  if (query.status) conditions.push(`e.status = ${param(query.status)}`);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const count: SqlQuery = {
    text: `SELECT count(*)::int AS total FROM employees e ${where}`,
    values: [...values],
  };

  const direction = query.order === 'desc' ? 'DESC' : 'ASC';
  const limit = param(query.pageSize);
  const offset = param((query.page - 1) * query.pageSize);
  const rows: SqlQuery = {
    // The id tie-break keeps the order stable, so paging never repeats or skips a row.
    text: `${EMPLOYEE_SELECT}
  ${where}
  ORDER BY ${SORT_EXPRESSIONS[query.sort]} ${direction}, e.id ASC
  LIMIT ${limit} OFFSET ${offset}`,
    values,
  };

  return { rows, count };
}
