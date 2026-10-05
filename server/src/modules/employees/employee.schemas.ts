import { z } from 'zod';

const id = (label: string) =>
  z.coerce
    .number({ error: `Choose a ${label}` })
    .int(`Choose a ${label}`)
    .positive(`Choose a ${label}`);

const name = z
  .string({ error: 'Enter a name' })
  .trim()
  .min(1, 'Enter a name')
  .max(120, 'Name must be 120 characters or fewer');

const email = z
  .string({ error: 'Enter an email address' })
  .trim()
  .max(254, 'Email must be 254 characters or fewer')
  .pipe(z.email({ error: 'Enter a valid email address' }));

const jobTitle = z
  .string({ error: 'Enter a job title' })
  .trim()
  .min(1, 'Enter a job title')
  .max(120, 'Job title must be 120 characters or fewer');

const isoDate = z.iso.date({ error: 'Enter a date as YYYY-MM-DD' });

/** A positive amount with at most two decimals, kept as a string so it is never a float. */
const money = z
  .union([z.string(), z.number()], { error: 'Enter an amount' })
  .transform((value) => String(value).trim())
  .pipe(
    z
      .string()
      .regex(/^\d{1,12}(\.\d{1,2})?$/, {
        error: 'Enter an amount with at most 2 decimal places',
        // Stop here, so text that is not an amount gets this one message only.
        abort: true,
      })
      .refine((value) => Number(value) > 0, 'Enter an amount greater than zero'),
  );

const status = z.enum(['active', 'inactive'], { error: 'Status must be active or inactive' });

export const employeeIdSchema = z.coerce
  .number({ error: 'Employee id must be a number' })
  .int('Employee id must be a number')
  .positive('Employee id must be a number');

/** Query string of GET /employees. Blank values (`?country=`) mean "no filter". */
export const employeeListQuerySchema = z.preprocess(
  (query) => Object.fromEntries(Object.entries(query ?? {}).filter(([, value]) => value !== '')),
  z.object({
    search: z.string().trim().max(100, 'Search must be 100 characters or fewer').optional(),
    country: z
      .string()
      .regex(/^[A-Z]{2}$/, 'Country must be a 2-letter code')
      .optional(),
    department: id('department').optional(),
    level: id('level').optional(),
    status: status.optional(),
    sort: z
      .enum(['name', 'hireDate', 'salary'], { error: 'Sort must be name, hireDate or salary' })
      .default('name'),
    order: z.enum(['asc', 'desc'], { error: 'Order must be asc or desc' }).default('asc'),
    page: z.coerce.number().int().min(1, 'Page must be 1 or more').default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1, 'Page size must be between 1 and 100')
      .max(100, 'Page size must be between 1 and 100')
      .default(25),
  }),
);

export const newEmployeeSchema = z.object({
  name,
  email,
  countryCode: z.string({ error: 'Choose a country' }).regex(/^[A-Z]{2}$/, 'Choose a country'),
  departmentId: id('department'),
  levelId: id('level'),
  jobTitle,
  hireDate: isoDate,
  salary: money,
});

// Strict, so an attempt to change salary or country here is rejected outright
// rather than silently ignored.
export const employeeChangesSchema = z
  .strictObject(
    {
      name: name.optional(),
      email: email.optional(),
      departmentId: id('department').optional(),
      levelId: id('level').optional(),
      jobTitle: jobTitle.optional(),
      status: status.optional(),
    },
    { error: 'Only name, email, department, level, job title and status can be edited' },
  )
  .refine((changes) => Object.keys(changes).length > 0, 'Nothing to update');

export const salaryChangeSchema = z.object({
  amount: money,
  effectiveDate: isoDate,
});
