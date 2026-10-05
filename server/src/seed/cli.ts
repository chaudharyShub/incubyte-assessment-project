import { loadEnv, loadSeedEnv } from '../config/env.js';
import { createPool } from '../db/pool.js';
import { generateEmployees } from './generate-employees.js';
import { seedDatabase } from './seed-database.js';

const EMPLOYEE_COUNT = 10_000;

const env = loadEnv();
const seedEnv = loadSeedEnv();
const pool = createPool({ connectionString: env.DATABASE_URL, schema: env.DATABASE_SCHEMA });

try {
  const startedAt = Date.now();
  const employees = generateEmployees(EMPLOYEE_COUNT);

  await seedDatabase(
    pool,
    {
      email: seedEnv.SEED_HR_EMAIL,
      password: seedEnv.SEED_HR_PASSWORD,
      name: seedEnv.SEED_HR_NAME,
    },
    employees,
  );

  const salaryRecords = employees.reduce((total, e) => total + e.salaryHistory.length, 0);
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `Seeded ${employees.length} employees and ${salaryRecords} salary records in ${seconds}s.`,
  );
  console.log(`HR Manager login: ${seedEnv.SEED_HR_EMAIL}`);
} finally {
  await pool.end();
}
