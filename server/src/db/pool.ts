import pg from 'pg';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export interface DatabaseConfig {
  connectionString: string;
  schema: string;
}

/** Hosted PostgreSQL requires TLS; a database on this machine does not offer it. */
export function sslFor(connectionString: string): pg.PoolConfig['ssl'] {
  const { hostname } = new URL(connectionString);
  return LOCAL_HOSTS.has(hostname) ? false : { rejectUnauthorized: false };
}

// pg parses DATE into a JS Date at local midnight, which shifts the day once it is
// serialised in another timezone. Dates are kept as 'YYYY-MM-DD' strings instead.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

export function createPool({ connectionString, schema }: DatabaseConfig): pg.Pool {
  const pool = new pg.Pool({
    connectionString,
    ssl: sslFor(connectionString),
    // Each serverless instance holds its own pool, so it is kept small.
    max: 5,
  });

  if (schema !== 'public') {
    // Queries are queued per client, so this runs before the first real query.
    // The schema name is validated as a plain identifier when the environment is loaded.
    pool.on('connect', (client) => {
      client.query(`SET search_path TO ${schema}`).catch((error) => pool.emit('error', error));
    });
  }

  return pool;
}

/** Runs `work` in a transaction, committing if it resolves and rolling back if it throws. */
export async function withTransaction<T>(
  pool: pg.Pool,
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
