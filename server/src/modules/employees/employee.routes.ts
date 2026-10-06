import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import {
  employeeChangesSchema,
  employeeIdSchema,
  employeeListQuerySchema,
  newEmployeeSchema,
  salaryChangeSchema,
} from './employee.schemas.js';
import type { EmployeeService } from './employee.service.js';

export function createEmployeeRouter(employees: EmployeeService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = validate(employeeListQuerySchema, req.query);
    res.json(await employees.list(query));
  });

  router.post('/', async (req, res) => {
    const employee = await employees.create(validate(newEmployeeSchema, req.body));
    res.status(201).json({ employee });
  });

  router.get('/:id', async (req, res) => {
    const id = validate(employeeIdSchema, req.params.id);
    res.json({ employee: await employees.get(id) });
  });

  router.patch('/:id', async (req, res) => {
    const id = validate(employeeIdSchema, req.params.id);
    const changes = validate(employeeChangesSchema, req.body);
    res.json({ employee: await employees.update(id, changes) });
  });

  router.get('/:id/salary-history', async (req, res) => {
    const id = validate(employeeIdSchema, req.params.id);
    res.json({ history: await employees.salaryHistory(id) });
  });

  router.get('/:id/peer-comparison', async (req, res) => {
    const id = validate(employeeIdSchema, req.params.id);
    res.json({ comparison: await employees.peerComparison(id) });
  });

  router.post('/:id/salary', async (req, res) => {
    const id = validate(employeeIdSchema, req.params.id);
    const change = validate(salaryChangeSchema, req.body);
    res.status(201).json({ employee: await employees.changeSalary(id, change) });
  });

  return router;
}
