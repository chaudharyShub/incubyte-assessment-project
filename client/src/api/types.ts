// The shapes the API returns. They mirror the server's types in
// server/src/modules; money is a decimal string and dates are 'YYYY-MM-DD'.

export type EmployeeStatus = 'active' | 'inactive';

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
  /** Current monthly salary in `currencyCode`. */
  salary: string;
  currencyCode: string;
  /** `salary` converted to INR. */
  salaryInr: string;
}

export interface EmployeePage {
  items: Employee[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SalaryRecord {
  id: number;
  amount: string;
  currencyCode: string;
  effectiveDate: string;
}

export interface Meta {
  countries: { code: string; name: string; currencyCode: string }[];
  departments: { id: number; name: string }[];
  levels: { id: number; name: string }[];
}

export type EmployeeSort = 'name' | 'hireDate' | 'salary';
export type SortOrder = 'asc' | 'desc';

/** What the employee list is showing. Absent filters mean "all". */
export interface EmployeeListParams {
  search: string;
  country: string;
  department: string;
  level: string;
  status: string;
  sort: EmployeeSort;
  order: SortOrder;
  page: number;
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
