import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createFakeInsightsRepository } from '../../test/fakes.js';
import { createTestApp, sessionCookie } from '../../test/test-app.js';
import { buildSalaryStatsQuery } from './insights.repository.js';

const SUMMARY = { headcount: 3, totalPayrollInr: '700000.00' };
const BY_COUNTRY = [
  {
    key: 'IN',
    label: 'India',
    headcount: 2,
    averageInr: '130000.00',
    medianInr: '130000.00',
    minInr: '80000.00',
    maxInr: '180000.00',
  },
];

describe('insights routes', () => {
  const insights = createFakeInsightsRepository(SUMMARY, { country: BY_COUNTRY });
  const app = createTestApp({ insightsRepository: insights });
  const get = (path: string) => request(app).get(path).set('Cookie', sessionCookie());

  it.each(['/api/insights/summary', '/api/insights/salary-stats?groupBy=country'])(
    'GET %s returns 401 without a session',
    async (path) => {
      const response = await request(app).get(path);

      expect(response.status).toBe(401);
    },
  );

  it('returns the headcount and total monthly payroll', async () => {
    const response = await get('/api/insights/summary');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(SUMMARY);
  });

  it('returns salary statistics for the requested grouping', async () => {
    const response = await get('/api/insights/salary-stats?groupBy=country');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ groupBy: 'country', groups: BY_COUNTRY });
  });

  it.each(['', '?groupBy=', '?groupBy=email', '?groupBy=country;DROP TABLE employees'])(
    'rejects salary-stats%s with 400',
    async (queryString) => {
      const response = await get(`/api/insights/salary-stats${queryString}`);

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual({
        groupBy: ['Group by must be country, department or level'],
      });
    },
  );
});

describe('buildSalaryStatsQuery', () => {
  it.each([
    ['country', 'GROUP BY co.code, co.name, co.name', 'ORDER BY co.name'],
    ['department', 'GROUP BY d.id, d.name, d.name', 'ORDER BY d.name'],
    ['level', 'GROUP BY l.id, l.name, l.rank', 'ORDER BY l.rank'],
  ] as const)('groups and orders by %s', (groupBy, groupClause, orderClause) => {
    const sql = buildSalaryStatsQuery(groupBy);

    expect(sql).toContain(groupClause);
    expect(sql).toContain(orderClause);
  });

  it('counts active employees only, in INR', () => {
    const sql = buildSalaryStatsQuery('country');

    expect(sql).toContain("WHERE e.status = 'active'");
    expect(sql).toContain('e.salary * cu.rate_to_inr');
  });
});
