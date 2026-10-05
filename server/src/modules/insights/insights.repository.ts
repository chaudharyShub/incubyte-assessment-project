import type pg from 'pg';

export type InsightsGroupBy = 'country' | 'department' | 'level';

/** All amounts are monthly, in INR, as decimal strings. Only active employees are counted. */
export interface InsightsSummary {
  headcount: number;
  totalPayrollInr: string;
}

export interface SalaryStatsGroup {
  /** The country code, or the department or level id. */
  key: string;
  label: string;
  headcount: number;
  averageInr: string;
  medianInr: string;
  minInr: string;
  maxInr: string;
}

export interface InsightsRepository {
  summary(): Promise<InsightsSummary>;
  salaryStats(groupBy: InsightsGroupBy): Promise<SalaryStatsGroup[]>;
}

// The only SQL a `groupBy` value can turn into.
const GROUPINGS: Record<InsightsGroupBy, { key: string; label: string; orderBy: string }> = {
  country: { key: 'co.code', label: 'co.name', orderBy: 'co.name' },
  department: { key: 'd.id', label: 'd.name', orderBy: 'd.name' },
  // Levels read best from most junior to most senior.
  level: { key: 'l.id', label: 'l.name', orderBy: 'l.rank' },
};

// Salaries are in local currencies, so each is converted to INR before aggregating.
const ACTIVE_SALARIES_IN_INR = `
  FROM employees e
  JOIN countries co ON co.code = e.country_code
  JOIN currencies cu ON cu.code = co.currency_code
  JOIN departments d ON d.id = e.department_id
  JOIN levels l ON l.id = e.level_id
  CROSS JOIN LATERAL (SELECT e.salary * cu.rate_to_inr AS salary_inr) s
  WHERE e.status = 'active'`;

export function buildSalaryStatsQuery(groupBy: InsightsGroupBy): string {
  const { key, label, orderBy } = GROUPINGS[groupBy];
  return `
  SELECT ${key}::text AS key,
         ${label} AS label,
         count(*)::int AS headcount,
         round(avg(s.salary_inr), 2) AS "averageInr",
         round((percentile_cont(0.5) WITHIN GROUP (ORDER BY s.salary_inr))::numeric, 2)
           AS "medianInr",
         round(min(s.salary_inr), 2) AS "minInr",
         round(max(s.salary_inr), 2) AS "maxInr"
  ${ACTIVE_SALARIES_IN_INR}
  GROUP BY ${key}, ${label}, ${orderBy}
  ORDER BY ${orderBy}`;
}

export function createInsightsRepository(pool: pg.Pool): InsightsRepository {
  return {
    async summary() {
      const { rows } = await pool.query<InsightsSummary>(
        `SELECT count(*)::int AS headcount,
                round(coalesce(sum(s.salary_inr), 0), 2) AS "totalPayrollInr"
         ${ACTIVE_SALARIES_IN_INR}`,
      );
      return rows[0]!;
    },

    async salaryStats(groupBy) {
      const { rows } = await pool.query<SalaryStatsGroup>(buildSalaryStatsQuery(groupBy));
      return rows;
    },
  };
}
