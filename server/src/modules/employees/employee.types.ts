export type EmployeeStatus = 'active' | 'inactive';

/**
 * An employee as the API returns it. Money is a decimal string ("82000.00") so
 * no precision is lost; dates are 'YYYY-MM-DD'.
 */
export interface Employee {
  id: number;
  name: string;
  email: string;
  countryCode: string;
  countryName: string;
  departmentId: number;
  departmentName: string;
  levelId: number;
  levelName: string;
  jobTitle: string;
  hireDate: string;
  status: EmployeeStatus;
  /** Current monthly salary in `currencyCode`, the currency of the employee's country. */
  salary: string;
  currencyCode: string;
  /** `salary` converted to INR at the fixed exchange rate. */
  salaryInr: string;
}

export interface SalaryRecord {
  id: number;
  amount: string;
  currencyCode: string;
  effectiveDate: string;
}

export interface EmployeeListQuery {
  search?: string;
  country?: string;
  department?: number;
  level?: number;
  status?: EmployeeStatus;
  sort: 'name' | 'hireDate' | 'salary';
  order: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface EmployeePage {
  items: Employee[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NewEmployee {
  name: string;
  email: string;
  countryCode: string;
  departmentId: number;
  levelId: number;
  jobTitle: string;
  hireDate: string;
  salary: string;
}

/** Salary and country are deliberately absent: they are not edited this way. */
export interface EmployeeChanges {
  name?: string;
  email?: string;
  departmentId?: number;
  levelId?: number;
  jobTitle?: string;
  status?: EmployeeStatus;
}

export interface SalaryChange {
  amount: string;
  effectiveDate: string;
}
