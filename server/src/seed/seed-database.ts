import type pg from 'pg';
import { withTransaction } from '../db/pool.js';
import { hashPassword } from '../modules/auth/password.js';
import { currentSalary, type GeneratedEmployee } from './generate-employees.js';
import { COUNTRIES, CURRENCIES, DEPARTMENTS, LEVELS } from './reference-data.js';

const BATCH_SIZE = 1000;
const CURRENCY_BY_COUNTRY = new Map<string, string>(
  COUNTRIES.map((country) => [country.code, country.currencyCode]),
);

export interface SeedUser {
  email: string;
  password: string;
  name: string;
}

function batches<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    result.push(items.slice(start, start + size));
  }
  return result;
}

// Each column travels as one array parameter, so a table is filled by a single
// statement however many rows it holds.
async function insertReferenceData(client: pg.PoolClient): Promise<void> {
  await client.query(
    `INSERT INTO currencies (code, name, rate_to_inr)
     SELECT * FROM unnest($1::text[], $2::text[], $3::numeric[])`,
    [
      CURRENCIES.map((c) => c.code),
      CURRENCIES.map((c) => c.name),
      CURRENCIES.map((c) => c.rateToInr),
    ],
  );
  await client.query(
    `INSERT INTO countries (code, name, currency_code)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[])`,
    [
      COUNTRIES.map((c) => c.code),
      COUNTRIES.map((c) => c.name),
      COUNTRIES.map((c) => c.currencyCode),
    ],
  );
  await client.query(
    `INSERT INTO departments (id, name) SELECT * FROM unnest($1::smallint[], $2::text[])`,
    [DEPARTMENTS.map((d) => d.id), DEPARTMENTS.map((d) => d.name)],
  );
  await client.query(
    `INSERT INTO levels (id, name, rank)
     SELECT * FROM unnest($1::smallint[], $2::text[], $3::smallint[])`,
    [LEVELS.map((l) => l.id), LEVELS.map((l) => l.name), LEVELS.map((l) => l.rank)],
  );
}

async function insertEmployees(
  client: pg.PoolClient,
  employees: GeneratedEmployee[],
): Promise<Map<string, number>> {
  const { rows } = await client.query<{ id: number; email: string }>(
    `INSERT INTO employees
       (name, email, country_code, department_id, level_id, job_title, hire_date, status, salary)
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::smallint[], $5::smallint[],
       $6::text[], $7::date[], $8::text[], $9::numeric[]
     )
     RETURNING id, email`,
    [
      employees.map((e) => e.name),
      employees.map((e) => e.email),
      employees.map((e) => e.countryCode),
      employees.map((e) => e.departmentId),
      employees.map((e) => e.levelId),
      employees.map((e) => e.jobTitle),
      employees.map((e) => e.hireDate),
      employees.map((e) => e.status),
      employees.map(currentSalary),
    ],
  );
  return new Map(rows.map((row) => [row.email, row.id]));
}

async function insertSalaryHistory(
  client: pg.PoolClient,
  employees: GeneratedEmployee[],
  idByEmail: Map<string, number>,
) {
  const rows = employees.flatMap((employee) =>
    employee.salaryHistory.map((salary) => ({
      employeeId: idByEmail.get(employee.email)!,
      currencyCode: CURRENCY_BY_COUNTRY.get(employee.countryCode)!,
      ...salary,
    })),
  );

  await client.query(
    `INSERT INTO salary_history (employee_id, amount, currency_code, effective_date)
     SELECT * FROM unnest($1::int[], $2::numeric[], $3::text[], $4::date[])`,
    [
      rows.map((r) => r.employeeId),
      rows.map((r) => r.amount),
      rows.map((r) => r.currencyCode),
      rows.map((r) => r.effectiveDate),
    ],
  );
}

/**
 * Replaces everything in the database with the reference data, the HR Manager
 * account and the given employees. All or nothing: a failure leaves the
 * database as it was.
 */
export async function seedDatabase(
  pool: pg.Pool,
  user: SeedUser,
  employees: GeneratedEmployee[],
): Promise<void> {
  const passwordHash = await hashPassword(user.password);

  await withTransaction(pool, async (client) => {
    await client.query(
      `TRUNCATE salary_history, employees, users, levels, departments, countries, currencies
       RESTART IDENTITY`,
    );

    await insertReferenceData(client);

    await client.query('INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)', [
      user.email,
      passwordHash,
      user.name,
    ]);

    for (const batch of batches(employees, BATCH_SIZE)) {
      const idByEmail = await insertEmployees(client, batch);
      await insertSalaryHistory(client, batch, idByEmail);
    }
  });
}
