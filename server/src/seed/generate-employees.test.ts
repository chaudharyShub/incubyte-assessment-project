import { describe, expect, it } from 'vitest';
import {
  currentSalary,
  generateEmployees,
  jobTitleFor,
  SEED_REFERENCE_DATE,
} from './generate-employees.js';
import { COUNTRIES, LEVELS, SALARY_BANDS } from './reference-data.js';

const employees = generateEmployees(10_000);

describe('generateEmployees', () => {
  it('generates the number of employees asked for', () => {
    expect(employees).toHaveLength(10_000);
  });

  it('produces identical data for the same seed', () => {
    expect(generateEmployees(200, 7)).toEqual(generateEmployees(200, 7));
  });

  it('produces different data for a different seed', () => {
    expect(generateEmployees(200, 7)).not.toEqual(generateEmployees(200, 8));
  });

  it('gives every employee a unique email, ignoring case', () => {
    const emails = new Set(employees.map((employee) => employee.email.toLowerCase()));

    expect(emails.size).toBe(employees.length);
  });

  it('places employees in every country, mostly in line with the country weights', () => {
    for (const country of COUNTRIES) {
      const share =
        (employees.filter((e) => e.countryCode === country.code).length / employees.length) * 100;

      expect(Math.abs(share - country.weight)).toBeLessThan(3);
    }
  });

  it('keeps the current salary inside the band for the country and level', () => {
    for (const employee of employees) {
      const level = LEVELS.find((l) => l.id === employee.levelId)!;
      const band = SALARY_BANDS[employee.countryCode][level.name];
      const salary = Number(currentSalary(employee));

      expect(salary).toBeGreaterThanOrEqual(band.min);
      expect(salary).toBeLessThanOrEqual(band.max);
    }
  });

  it('formats every amount as a positive number with two decimals', () => {
    const amounts = employees.flatMap((e) => e.salaryHistory.map((s) => s.amount));

    expect(amounts.every((amount) => /^\d+\.\d{2}$/.test(amount) && Number(amount) > 0)).toBe(true);
  });

  it('marks a minority of employees inactive', () => {
    const inactive = employees.filter((e) => e.status === 'inactive').length;

    expect(inactive).toBeGreaterThan(0);
    expect(inactive).toBeLessThan(employees.length * 0.15);
  });
});

describe('generated salary history', () => {
  it('gives every employee between one and three records', () => {
    const counts = new Set(employees.map((e) => e.salaryHistory.length));

    expect([...counts].sort()).toEqual([1, 2, 3]);
  });

  it('starts on the hire date', () => {
    expect(employees.every((e) => e.salaryHistory[0]!.effectiveDate === e.hireDate)).toBe(true);
  });

  it('has strictly increasing dates that are never in the future', () => {
    for (const { salaryHistory } of employees) {
      const dates = salaryHistory.map((s) => s.effectiveDate);

      expect(dates).toEqual([...new Set(dates)].sort());
      expect(dates.at(-1)! <= SEED_REFERENCE_DATE).toBe(true);
    }
  });

  it('only ever raises a salary', () => {
    for (const { salaryHistory } of employees) {
      const amounts = salaryHistory.map((s) => Number(s.amount));

      expect(amounts).toEqual([...amounts].sort((a, b) => a - b));
      expect(new Set(amounts).size).toBe(amounts.length);
    }
  });
});

describe('jobTitleFor', () => {
  it.each([
    ['Junior', 'Junior Software Engineer'],
    ['Mid', 'Software Engineer'],
    ['Senior', 'Senior Software Engineer'],
    ['Manager', 'Engineering Manager'],
  ] as const)('names a %s in Engineering "%s"', (level, expected) => {
    expect(jobTitleFor('Software Engineer', 'Engineering', level)).toBe(expected);
  });
});
