import { describe, expect, it } from 'vitest';
import { buildEmployeeListQuery } from './employee-list-query.js';
import type { EmployeeListQuery } from './employee.types.js';

const DEFAULTS: EmployeeListQuery = { sort: 'name', order: 'asc', page: 1, pageSize: 25 };

function build(overrides: Partial<EmployeeListQuery> = {}) {
  return buildEmployeeListQuery({ ...DEFAULTS, ...overrides });
}

describe('buildEmployeeListQuery', () => {
  it('has no WHERE clause when there are no filters', () => {
    const { rows, count } = build();

    expect(rows.text).not.toContain('WHERE');
    expect(count.text).not.toContain('WHERE');
    expect(count.values).toEqual([]);
  });

  it('turns the page and page size into LIMIT and OFFSET parameters', () => {
    const { rows } = build({ page: 3, pageSize: 50 });

    expect(rows.text).toContain('LIMIT $1 OFFSET $2');
    expect(rows.values).toEqual([50, 100]);
  });

  it('searches name and email with one case-insensitive pattern', () => {
    const { rows, count } = build({ search: 'ann' });

    expect(rows.text).toContain('(e.name ILIKE $1 OR e.email ILIKE $1)');
    expect(rows.values[0]).toBe('%ann%');
    expect(count.values).toEqual(['%ann%']);
  });

  it('treats wildcard characters in the search term as ordinary text', () => {
    const { rows } = build({ search: '50%_off\\' });

    expect(rows.values[0]).toBe('%50\\%\\_off\\\\%');
  });

  it('combines every filter with AND, each as its own parameter', () => {
    const { rows, count } = build({
      search: 'ann',
      country: 'IN',
      department: 2,
      level: 3,
      status: 'active',
    });

    expect(rows.text).toContain(
      'WHERE (e.name ILIKE $1 OR e.email ILIKE $1) AND e.country_code = $2 ' +
        'AND e.department_id = $3 AND e.level_id = $4 AND e.status = $5',
    );
    expect(rows.values).toEqual(['%ann%', 'IN', 2, 3, 'active', 25, 0]);
    expect(count.values).toEqual(['%ann%', 'IN', 2, 3, 'active']);
  });

  it('gives the count query the same filters but no paging', () => {
    const { count } = build({ country: 'US', page: 4 });

    expect(count.text).toContain('WHERE e.country_code = $1');
    expect(count.text).not.toContain('LIMIT');
  });

  it.each([
    ['name', 'asc', 'ORDER BY e.name ASC, e.id ASC'],
    ['hireDate', 'desc', 'ORDER BY e.hire_date DESC, e.id ASC'],
    ['salary', 'desc', 'ORDER BY e.salary * cu.rate_to_inr DESC, e.id ASC'],
  ] as const)('sorts by %s %s', (sort, order, expected) => {
    expect(build({ sort, order }).rows.text).toContain(expected);
  });

  it('never places a filter value into the SQL text', () => {
    const { rows, count } = build({ search: "'; DROP TABLE employees; --", country: 'IN' });

    expect(rows.text).not.toContain('DROP TABLE');
    expect(count.text).not.toContain('DROP TABLE');
  });
});
