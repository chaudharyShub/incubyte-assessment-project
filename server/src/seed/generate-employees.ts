import { en, Faker } from '@faker-js/faker';
import {
  COUNTRIES,
  DEPARTMENTS,
  LEVELS,
  SALARY_BANDS,
  SALARY_STEP,
  type CountryCode,
  type LevelName,
} from './reference-data.js';

/** Stands in for "today", so the generated data never depends on when the seed is run. */
export const SEED_REFERENCE_DATE = '2026-10-01';
const EARLIEST_HIRE_DATE = '2016-01-01';
const DEFAULT_SEED = 20261001;

const MS_PER_DAY = 86_400_000;
const INACTIVE_PERCENT = 8;
/** Employees hired more recently than this have not had a salary change yet. */
const MIN_TENURE_DAYS_FOR_RAISE = 180;
const MIN_DAYS_BEFORE_FIRST_RAISE = 90;

export interface GeneratedSalary {
  amount: string;
  effectiveDate: string;
}

export interface GeneratedEmployee {
  name: string;
  email: string;
  countryCode: CountryCode;
  departmentId: number;
  levelId: number;
  jobTitle: string;
  hireDate: string;
  status: 'active' | 'inactive';
  /** Oldest first. The first entry starts on the hire date; the last is the current salary. */
  salaryHistory: GeneratedSalary[];
}

function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(isoDate) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  return Math.round((Date.parse(toIsoDate) - Date.parse(fromIsoDate)) / MS_PER_DAY);
}

function roundToStep(amount: number, step: number): number {
  return Math.round(amount / step) * step;
}

function weighted<T extends { weight: number }>(faker: Faker, options: readonly T[]): T {
  return faker.helpers.weightedArrayElement(
    options.map((value) => ({ value, weight: value.weight })),
  );
}

export function jobTitleFor(role: string, departmentName: string, level: LevelName): string {
  switch (level) {
    case 'Junior':
      return `Junior ${role}`;
    case 'Mid':
      return role;
    case 'Senior':
      return `Senior ${role}`;
    case 'Manager':
      return `${departmentName} Manager`;
  }
}

function emailFor(firstName: string, lastName: string, index: number): string {
  const slug = (value: string) => value.toLowerCase().replace(/[^a-z]/g, '');
  // The running number makes every address unique, even for people who share a name.
  return `${slug(firstName)}.${slug(lastName)}${index + 1}@acme.example`;
}

function generateSalaryHistory(
  faker: Faker,
  countryCode: CountryCode,
  level: LevelName,
  hireDate: string,
): GeneratedSalary[] {
  const band = SALARY_BANDS[countryCode][level];
  const step = SALARY_STEP[countryCode];
  const tenureDays = daysBetween(hireDate, SEED_REFERENCE_DATE);
  const recordCount =
    tenureDays < MIN_TENURE_DAYS_FOR_RAISE ? 1 : faker.number.int({ min: 1, max: 3 });

  const raiseOffsets = new Set<number>();
  while (raiseOffsets.size < recordCount - 1) {
    raiseOffsets.add(faker.number.int({ min: MIN_DAYS_BEFORE_FIRST_RAISE, max: tenureDays }));
  }
  const offsets = [0, ...[...raiseOffsets].sort((a, b) => a - b)];

  // Work backwards from the current salary, undoing one raise per earlier record.
  const amounts = [roundToStep(faker.number.int(band), step)];
  while (amounts.length < recordCount) {
    const later = amounts[0]!;
    const raisePercent = faker.number.int({ min: 3, max: 12 });
    const earlier = roundToStep(later / (1 + raisePercent / 100), step);
    amounts.unshift(Math.min(earlier, later - step));
  }

  return offsets.map((offset, i) => ({
    amount: amounts[i]!.toFixed(2),
    effectiveDate: addDays(hireDate, offset),
  }));
}

/**
 * Generates `count` employees with their salary histories.
 * The same `seed` always produces exactly the same employees.
 */
export function generateEmployees(count: number, seed = DEFAULT_SEED): GeneratedEmployee[] {
  const faker = new Faker({ locale: [en] });
  faker.seed(seed);

  const latestHireOffset = daysBetween(EARLIEST_HIRE_DATE, SEED_REFERENCE_DATE) - 30;

  return Array.from({ length: count }, (_, index) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const country = weighted(faker, COUNTRIES);
    const department = weighted(faker, DEPARTMENTS);
    const level = weighted(faker, LEVELS);
    const hireDate = addDays(
      EARLIEST_HIRE_DATE,
      faker.number.int({ min: 0, max: latestHireOffset }),
    );

    return {
      name: `${firstName} ${lastName}`,
      email: emailFor(firstName, lastName, index),
      countryCode: country.code,
      departmentId: department.id,
      levelId: level.id,
      jobTitle: jobTitleFor(department.role, department.name, level.name),
      hireDate,
      status: faker.number.int({ min: 1, max: 100 }) <= INACTIVE_PERCENT ? 'inactive' : 'active',
      salaryHistory: generateSalaryHistory(faker, country.code, level.name, hireDate),
    };
  });
}

export function currentSalary(employee: GeneratedEmployee): string {
  return employee.salaryHistory.at(-1)!.amount;
}
