# Requirements — Employee Salary Management Software

**Status:** Approved · **Date:** 2026-10-05

## Goal

Replace the spreadsheets ACME's HR team uses to manage salary data for 10,000 employees across multiple countries with a web application in which the HR Manager can maintain that data and answer questions about how the organisation pays people.

## User

A single persona: the **HR Manager** of the organisation. They are the only user of the system.

## Scope and features

**1. Login**
- The HR Manager signs in with an email and password. The account is seeded; there is no public registration.
- Every page and API endpoint other than login requires a signed-in session.

**2. Employee salary records**
- Each employee has: name, email, country, department, level, job title, hire date, salary and status (active / inactive).
- A salary is a monthly amount.
- The HR Manager can list employees, with search, filtering (country, department, level, status), sorting and pagination, so that 10,000 records stay usable.
- The HR Manager can view one employee, add an employee, edit an employee's details, and mark an employee inactive.
- An employee's country is set when they are added and cannot be changed afterwards, because it determines the currency of their salary.

**3. Salary change history**
- A salary is never overwritten. Each change is saved as a new dated record, so an employee's record shows their current salary and every earlier one.
- A change's effective date cannot be in the future and must be later than the employee's previous change, so the current salary is always the latest record.

**4. Multiple currencies**
- Each salary is held and shown in the local currency of the employee's country.
- For figures that span countries, salaries are converted to INR using a fixed table of exchange rates loaded with the seed data.

**5. Pay insights**
- Headcount and total monthly payroll for the organisation.
- Average, median, minimum and maximum salary, broken down by country, by department and by level.
- Shown as tables and charts, in INR.
- Insights count active employees only.

**6. Data**
- A seed script creates 10,000 employees, plus the HR Manager account and the exchange rates.

## Deliberately left out

| Left out | Reasoning |
|---|---|
| Payroll processing, tax and payslips | A different product with country-specific compliance rules. The problem is managing and understanding salary data, not paying people. |
| Live exchange rates | Fixed rates keep the insights reproducible and avoid depending on a third-party service. The cost is that converted figures are indicative, not current. |
| CSV export and import | The data is seeded by us, so there is nothing to bring in or take out through files. |
| Public signup, multiple roles, approvals | There is one persona. Salary data is sensitive, so access is limited to the seeded HR Manager account. |
| Bonuses, equity and other compensation | The brief speaks of salaries only. |
| Moving an employee to another country | A move changes the salary's currency, which would leave one employee with records in two currencies. Country is fixed once the employee is added. |

## Technical constraints

- **Backend:** Node.js, Express.js, PostgreSQL, in TypeScript.
- **UI:** ReactJS in TypeScript, with shadcn/ui components on Tailwind CSS and Recharts for charts.
- **Deployment:** Vercel for the application, Supabase for PostgreSQL (also used for development and integration tests).
- **Quality:** unit tests covering the core functionality that are fast, deterministic and easy to understand; incremental commit history.

## Deliverables

- Fully functional deployed software, backend and UI.
- Seed script with 10,000 employees.
- A video demo.
- Supporting artifacts in this repository: this document, design and decision notes, and the log of AI prompts.
