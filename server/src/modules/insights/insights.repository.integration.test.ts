import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { currentSalary, type GeneratedEmployee } from '../../seed/generate-employees.js';
import { COUNTRIES, CURRENCIES, DEPARTMENTS, LEVELS } from '../../seed/reference-data.js';
import { setUpIntegrationDatabase, type IntegrationDatabase } from '../../test/integration-db.js';
import { createInsightsRepository, type InsightsRepository } from './insights.repository.js';

function salaryInr(employee: GeneratedEmployee): number {
  const country = COUNTRIES.find((c) => c.code === employee.countryCode)!;
  const rate = CURRENCIES.find((c) => c.code === country.currencyCode)!.rateToInr;
  return Number(currentSalary(employee)) * Number(rate);
}

/** The median as PostgreSQL's percentile_cont(0.5) defines it: the middle value, or the mean of the two middle values. */
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length / 2;
  return sorted.length % 2 === 1
    ? sorted[Math.floor(middle)]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function expectedStats(employees: GeneratedEmployee[]) {
  const salaries = employees.map(salaryInr);
  return {
    headcount: salaries.length,
    average: salaries.reduce((sum, salary) => sum + salary, 0) / salaries.length,
    median: median(salaries),
    min: Math.min(...salaries),
    max: Math.max(...salaries),
  };
}

describe('insights repository (PostgreSQL)', () => {
  let db: IntegrationDatabase;
  let insights: InsightsRepository;
  let active: GeneratedEmployee[];

  beforeAll(async () => {
    db = await setUpIntegrationDatabase();
    insights = createInsightsRepository(db.pool);
    active = db.seeded.filter((e) => e.status === 'active');
  });

  afterAll(async () => {
    await db?.close();
  });

  it('has inactive employees in the data, so excluding them is actually tested', () => {
    expect(active.length).toBeLessThan(db.seeded.length);
  });

  it('counts active employees and totals their salaries in INR', async () => {
    const summary = await insights.summary();

    expect(summary.headcount).toBe(active.length);
    expect(Number(summary.totalPayrollInr)).toBeCloseTo(
      active.reduce((sum, e) => sum + salaryInr(e), 0),
      2,
    );
  });

  it.each([
    ['country', (e: GeneratedEmployee) => e.countryCode],
    ['department', (e: GeneratedEmployee) => String(e.departmentId)],
    ['level', (e: GeneratedEmployee) => String(e.levelId)],
  ] as const)('computes average, median, min and max for each %s', async (groupBy, keyOf) => {
    const groups = await insights.salaryStats(groupBy);

    const keys = [...new Set(active.map(keyOf))];
    expect(groups.map((g) => g.key).sort()).toEqual(keys.sort());

    for (const group of groups) {
      const expected = expectedStats(active.filter((e) => keyOf(e) === group.key));

      expect(group.headcount).toBe(expected.headcount);
      expect(Number(group.averageInr)).toBeCloseTo(expected.average, 1);
      expect(Number(group.medianInr)).toBeCloseTo(expected.median, 1);
      expect(Number(group.minInr)).toBeCloseTo(expected.min, 2);
      expect(Number(group.maxInr)).toBeCloseTo(expected.max, 2);
    }
  });

  it('labels groups by name, with levels ordered from junior to senior', async () => {
    const byLevel = await insights.salaryStats('level');
    const byDepartment = await insights.salaryStats('department');

    const levelNames = LEVELS.map((l) => l.name as string);
    expect(byLevel.map((g) => g.label)).toEqual(
      levelNames.filter((name) => byLevel.some((g) => g.label === name)),
    );
    expect(byDepartment.map((g) => g.label)).toEqual(
      DEPARTMENTS.map((d) => d.name as string)
        .filter((name) => byDepartment.some((g) => g.label === name))
        .sort(),
    );
  });
});
