import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  aNewEmployee,
  createFakeEmployeeRepository,
  TEST_META,
  type FakeEmployeeRepository,
} from '../../test/fakes.js';
import { createTestApp, sessionCookie } from '../../test/test-app.js';

describe('employee routes', () => {
  let repository: FakeEmployeeRepository;
  let app: ReturnType<typeof createTestApp>;

  const get = (path: string) => request(app).get(path).set('Cookie', sessionCookie());
  const post = (path: string, body: object) =>
    request(app).post(path).set('Cookie', sessionCookie()).send(body);
  const patch = (path: string, body: object) =>
    request(app).patch(path).set('Cookie', sessionCookie()).send(body);

  beforeEach(() => {
    repository = createFakeEmployeeRepository();
    app = createTestApp({ employeeRepository: repository });
  });

  describe('without a session', () => {
    it.each([
      ['GET', '/api/employees'],
      ['POST', '/api/employees'],
      ['GET', '/api/employees/1'],
      ['PATCH', '/api/employees/1'],
      ['GET', '/api/employees/1/salary-history'],
      ['POST', '/api/employees/1/salary'],
      ['GET', '/api/employees/1/peer-comparison'],
      ['GET', '/api/meta'],
    ])('%s %s returns 401', async (method, path) => {
      const response = await request(app)[method.toLowerCase() as 'get' | 'post' | 'patch'](path);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('GET /api/meta', () => {
    it('returns the countries, departments and levels', async () => {
      const response = await get('/api/meta');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(TEST_META);
    });
  });

  describe('GET /api/employees', () => {
    it('returns a page of employees with the total', async () => {
      await repository.create(aNewEmployee());

      const response = await get('/api/employees');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 1, page: 1, pageSize: 25 });
      expect(response.body.items[0]).toMatchObject({ name: 'Asha Rao', salary: '80000.00' });
    });

    it('applies default sorting and paging when none is given', async () => {
      await get('/api/employees');

      expect(repository.listQueries).toEqual([
        { sort: 'name', order: 'asc', page: 1, pageSize: 25 },
      ]);
    });

    it('passes search, filters, sorting and paging on as typed values', async () => {
      await get(
        '/api/employees?search=%20ann%20&country=IN&department=2&level=1&status=inactive' +
          '&sort=salary&order=desc&page=3&pageSize=50',
      );

      expect(repository.listQueries).toEqual([
        {
          search: 'ann',
          country: 'IN',
          department: 2,
          level: 1,
          status: 'inactive',
          sort: 'salary',
          order: 'desc',
          page: 3,
          pageSize: 50,
        },
      ]);
    });

    it('treats a blank filter as no filter', async () => {
      const response = await get('/api/employees?search=&country=&department=&status=');

      expect(response.status).toBe(200);
      expect(repository.listQueries).toEqual([
        { sort: 'name', order: 'asc', page: 1, pageSize: 25 },
      ]);
    });

    it.each([
      ['sort=password', 'sort', 'Sort must be name, hireDate or salary'],
      ['order=sideways', 'order', 'Order must be asc or desc'],
      ['pageSize=500', 'pageSize', 'Page size must be between 1 and 100'],
      ['page=0', 'page', 'Page must be 1 or more'],
      ['status=retired', 'status', 'Status must be active or inactive'],
    ])('rejects ?%s with 400', async (queryString, field, message) => {
      const response = await get(`/api/employees?${queryString}`);

      expect(response.status).toBe(400);
      expect(response.body.error.details[field]).toEqual([message]);
      expect(repository.listQueries).toEqual([]);
    });
  });

  describe('POST /api/employees', () => {
    it('creates the employee and returns it with 201', async () => {
      const response = await post('/api/employees', aNewEmployee());

      expect(response.status).toBe(201);
      expect(response.body.employee).toMatchObject({
        id: 1,
        name: 'Asha Rao',
        status: 'active',
        salary: '80000.00',
        currencyCode: 'INR',
      });
    });

    it('accepts the salary as a number as well as a string', async () => {
      const response = await post('/api/employees', { ...aNewEmployee(), salary: 80000.5 });

      expect(response.body.employee.salary).toBe('80000.50');
    });

    it('returns 400 with a message for every missing field', async () => {
      const response = await post('/api/employees', {});

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual({
        name: ['Enter a name'],
        email: ['Enter an email address'],
        countryCode: ['Choose a country'],
        departmentId: ['Choose a department'],
        levelId: ['Choose a level'],
        jobTitle: ['Enter a job title'],
        hireDate: ['Enter a date as YYYY-MM-DD'],
        salary: ['Enter an amount'],
      });
    });

    it.each([
      ['0', 'Enter an amount greater than zero'],
      ['-500', 'Enter an amount with at most 2 decimal places'],
      ['100.123', 'Enter an amount with at most 2 decimal places'],
      ['lots', 'Enter an amount with at most 2 decimal places'],
    ])('rejects a salary of "%s"', async (salary, message) => {
      const response = await post('/api/employees', { ...aNewEmployee(), salary });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual({ salary: [message] });
    });

    it('rejects a date that does not exist', async () => {
      const response = await post('/api/employees', { ...aNewEmployee(), hireDate: '2024-02-30' });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual({ hireDate: ['Enter a date as YYYY-MM-DD'] });
    });
  });

  describe('GET /api/employees/:id', () => {
    it('returns the employee', async () => {
      const id = await repository.create(aNewEmployee());

      const response = await get(`/api/employees/${id}`);

      expect(response.status).toBe(200);
      expect(response.body.employee).toMatchObject({ id, name: 'Asha Rao' });
    });

    it('returns 404 for an employee that does not exist', async () => {
      const response = await get('/api/employees/999');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('EMPLOYEE_NOT_FOUND');
    });

    it('returns 400 for an id that is not a number', async () => {
      const response = await get('/api/employees/abc');

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/employees/:id', () => {
    let id: number;

    beforeEach(async () => {
      id = await repository.create(aNewEmployee());
    });

    it('updates the given fields', async () => {
      const response = await patch(`/api/employees/${id}`, { status: 'inactive', levelId: 2 });

      expect(response.status).toBe(200);
      expect(response.body.employee).toMatchObject({ status: 'inactive', levelName: 'Senior' });
    });

    it.each([
      ['salary', { salary: '999999' }],
      ['country', { countryCode: 'US' }],
    ])('refuses to change the %s', async (_field, body) => {
      const response = await patch(`/api/employees/${id}`, body);

      expect(response.status).toBe(400);
      expect((await repository.findById(id))!).toMatchObject({
        salary: '80000.00',
        countryCode: 'IN',
      });
    });

    it('returns 400 when there is nothing to update', async () => {
      const response = await patch(`/api/employees/${id}`, {});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/employees/:id/salary', () => {
    let id: number;

    beforeEach(async () => {
      id = await repository.create(aNewEmployee({ hireDate: '2024-03-01', salary: '80000.00' }));
    });

    it('records the change and returns the employee with the new salary', async () => {
      const response = await post(`/api/employees/${id}/salary`, {
        amount: '95000',
        effectiveDate: '2025-04-01',
      });

      expect(response.status).toBe(201);
      expect(response.body.employee.salary).toBe('95000.00');
    });

    it('returns 400 when the service rejects the date', async () => {
      const response = await post(`/api/employees/${id}/salary`, {
        amount: '95000',
        effectiveDate: '2024-01-01',
      });

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual({
        effectiveDate: ['Effective date must be after the previous change on 2024-03-01'],
      });
    });

    it('returns 400 when the amount or date is missing', async () => {
      const response = await post(`/api/employees/${id}/salary`, {});

      expect(response.status).toBe(400);
      expect(response.body.error.details).toEqual({
        amount: ['Enter an amount'],
        effectiveDate: ['Enter a date as YYYY-MM-DD'],
      });
    });
  });

  describe('GET /api/employees/:id/salary-history', () => {
    it('returns every salary record, newest first', async () => {
      const id = await repository.create(aNewEmployee({ hireDate: '2024-03-01' }));
      await post(`/api/employees/${id}/salary`, { amount: '95000', effectiveDate: '2025-04-01' });

      const response = await get(`/api/employees/${id}/salary-history`);

      expect(response.status).toBe(200);
      expect(response.body.history).toMatchObject([
        { amount: '95000.00', currencyCode: 'INR', effectiveDate: '2025-04-01' },
        { amount: '80000.00', currencyCode: 'INR', effectiveDate: '2024-03-01' },
      ]);
    });

    it('returns 404 for an employee that does not exist', async () => {
      const response = await get('/api/employees/999/salary-history');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/employees/:id/peer-comparison', () => {
    it('returns how the salary compares with peers in the same country and level', async () => {
      const salaries = ['60000', '80000', '100000', '120000', '140000'];
      const ids = [];
      for (const [i, salary] of salaries.entries()) {
        ids.push(await repository.create(aNewEmployee({ salary, email: `peer${i}@example.com` })));
      }

      const response = await get(`/api/employees/${ids[4]}/peer-comparison`);

      expect(response.status).toBe(200);
      expect(response.body.comparison).toEqual({
        peerCount: 5,
        median: '100000.00',
        min: '60000.00',
        max: '140000.00',
        currencyCode: 'INR',
        differenceFromMedianPercent: 40,
      });
    });

    it('returns a null comparison when there are too few peers', async () => {
      const id = await repository.create(aNewEmployee());

      const response = await get(`/api/employees/${id}/peer-comparison`);

      expect(response.status).toBe(200);
      expect(response.body.comparison).toBeNull();
    });

    it('returns 404 for an employee that does not exist', async () => {
      const response = await get('/api/employees/999/peer-comparison');

      expect(response.status).toBe(404);
    });
  });
});
