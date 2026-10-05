import type pg from 'pg';

export interface Meta {
  countries: { code: string; name: string; currencyCode: string }[];
  departments: { id: number; name: string }[];
  levels: { id: number; name: string }[];
}

export interface MetaRepository {
  getMeta(): Promise<Meta>;
}

export function createMetaRepository(pool: pg.Pool): MetaRepository {
  // Reference data only changes when the database is re-seeded, so it is read
  // once per server instance rather than on every request.
  let cached: Promise<Meta> | undefined;

  async function load(): Promise<Meta> {
    const [countries, departments, levels] = await Promise.all([
      pool.query<Meta['countries'][number]>(
        `SELECT code, name, currency_code AS "currencyCode" FROM countries ORDER BY name`,
      ),
      pool.query<Meta['departments'][number]>('SELECT id, name FROM departments ORDER BY name'),
      pool.query<Meta['levels'][number]>('SELECT id, name FROM levels ORDER BY rank'),
    ]);
    return { countries: countries.rows, departments: departments.rows, levels: levels.rows };
  }

  return {
    getMeta() {
      cached ??= load().catch((error) => {
        // Do not cache a failure: the next request should try again.
        cached = undefined;
        throw error;
      });
      return cached;
    },
  };
}
