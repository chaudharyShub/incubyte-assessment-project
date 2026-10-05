export type CountryCode = 'IN' | 'US' | 'GB' | 'DE' | 'SG';
export type LevelName = 'Junior' | 'Mid' | 'Senior' | 'Manager';

/** Fixed, indicative exchange rates: how many INR one unit of the currency buys. */
export const CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', rateToInr: '1' },
  { code: 'USD', name: 'US Dollar', rateToInr: '88' },
  { code: 'GBP', name: 'Pound Sterling', rateToInr: '118' },
  { code: 'EUR', name: 'Euro', rateToInr: '103' },
  { code: 'SGD', name: 'Singapore Dollar', rateToInr: '68' },
] as const;

/** `weight` is the share of employees placed in the country, out of 100. */
export const COUNTRIES = [
  { code: 'IN', name: 'India', currencyCode: 'INR', weight: 45 },
  { code: 'US', name: 'United States', currencyCode: 'USD', weight: 25 },
  { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', weight: 12 },
  { code: 'DE', name: 'Germany', currencyCode: 'EUR', weight: 10 },
  { code: 'SG', name: 'Singapore', currencyCode: 'SGD', weight: 8 },
] as const satisfies readonly { code: CountryCode; [key: string]: unknown }[];

/** `role` is the job title of a Mid-level employee in the department. */
export const DEPARTMENTS = [
  { id: 1, name: 'Engineering', role: 'Software Engineer', weight: 40 },
  { id: 2, name: 'Sales', role: 'Account Executive', weight: 25 },
  { id: 3, name: 'Marketing', role: 'Marketing Specialist', weight: 12 },
  { id: 4, name: 'Finance', role: 'Financial Analyst', weight: 12 },
  { id: 5, name: 'Human Resources', role: 'HR Specialist', weight: 11 },
] as const;

export const LEVELS = [
  { id: 1, name: 'Junior', rank: 1, weight: 35 },
  { id: 2, name: 'Mid', rank: 2, weight: 35 },
  { id: 3, name: 'Senior', rank: 3, weight: 22 },
  { id: 4, name: 'Manager', rank: 4, weight: 8 },
] as const satisfies readonly { name: LevelName; [key: string]: unknown }[];

export interface SalaryBand {
  min: number;
  max: number;
}

/** Monthly salary range in local currency for each country and level. */
export const SALARY_BANDS: Record<CountryCode, Record<LevelName, SalaryBand>> = {
  IN: {
    Junior: { min: 30_000, max: 60_000 },
    Mid: { min: 60_000, max: 120_000 },
    Senior: { min: 120_000, max: 220_000 },
    Manager: { min: 200_000, max: 350_000 },
  },
  US: {
    Junior: { min: 4_500, max: 6_500 },
    Mid: { min: 6_500, max: 9_500 },
    Senior: { min: 9_500, max: 14_000 },
    Manager: { min: 13_000, max: 18_000 },
  },
  GB: {
    Junior: { min: 2_500, max: 3_800 },
    Mid: { min: 3_800, max: 5_500 },
    Senior: { min: 5_500, max: 8_000 },
    Manager: { min: 7_500, max: 10_500 },
  },
  DE: {
    Junior: { min: 3_200, max: 4_500 },
    Mid: { min: 4_500, max: 6_200 },
    Senior: { min: 6_200, max: 8_500 },
    Manager: { min: 8_000, max: 11_000 },
  },
  SG: {
    Junior: { min: 3_500, max: 5_500 },
    Mid: { min: 5_500, max: 8_500 },
    Senior: { min: 8_500, max: 13_000 },
    Manager: { min: 12_000, max: 17_000 },
  },
};

/** Salaries are rounded to a multiple of this, so they look like real agreed figures. */
export const SALARY_STEP: Record<CountryCode, number> = {
  IN: 500,
  US: 50,
  GB: 50,
  DE: 50,
  SG: 50,
};
