import { createApp } from './app.js';
import { loadAuthEnv, loadEnv } from './config/env.js';
import { createPool } from './db/pool.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createEmployeeRepository } from './modules/employees/employee.repository.js';
import { createMetaRepository } from './modules/meta/meta.repository.js';

const env = loadEnv();
const authEnv = loadAuthEnv();
const pool = createPool({ connectionString: env.DATABASE_URL, schema: env.DATABASE_SCHEMA });

const app = createApp({
  authRepository: createAuthRepository(pool),
  employeeRepository: createEmployeeRepository(pool),
  metaRepository: createMetaRepository(pool),
  session: {
    jwtSecret: authEnv.JWT_SECRET,
    secureCookies: process.env.NODE_ENV === 'production',
  },
});

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
