# Decisions and Trade-offs

**Status:** Draft for review · **Date:** 2026-10-05

Each entry records a choice, why it was made, and what it costs. Product decisions were made by the project owner; technical ones are proposed in [ARCHITECTURE.md](ARCHITECTURE.md).

## Product

### 1. Login only, with a seeded HR Manager account
- **Why:** The brief has one persona, and salary data should not be readable by anyone who finds the URL.
- **Cost:** A second HR user cannot be added through the UI.

### 2. Salary changes are appended, never overwritten
- **Why:** A spreadsheet cell loses the old value when it is edited. Keeping every change lets the HR Manager see how an employee's pay has moved.
- **Cost:** Two places hold salary data (see decision 9).
- **Kept small:** A change records the amount and the effective date only, with no reason field. The date cannot be in the future and must follow the previous change, so the current salary is always the latest record and no future-dated changes need scheduling.

### 3. Local currency per employee, converted to INR for comparison
- **Why:** The organisation spans countries, and people are paid in their local currency. Converting to one currency is the only way to total or compare pay across countries.
- **Cost:** Converted figures depend on the exchange rates used.

### 4. Fixed exchange rates loaded with the seed data
- **Why:** The same data always gives the same insights, tests stay deterministic, and the app has no third-party dependency.
- **Cost:** Rates are indicative and not current. Changing one means updating the `currencies` table.

### 5. No CSV import or export
- **Why:** The data is seeded by us, so there is nothing to move through files.
- **Cost:** The HR Manager cannot take a filtered list into a spreadsheet.

### 6. Country is fixed once an employee is added
- **Why:** Country determines the salary's currency. Allowing it to change would leave an employee with records in two currencies.
- **Cost:** A relocation cannot be recorded on the existing employee.

### 7. Salaries are monthly, and insights count active employees only
- **Why:** Total payroll then reads as what the organisation pays each month to the people it currently employs.
- **Cost:** Inactive employees appear in the list but in no statistic.

## Technical

### 8. Hand-written SQL with `pg`, no ORM
- **Why:** The core of the product is aggregate queries (median, grouped statistics, currency conversion). These are clearer in SQL than in an ORM's query builder, and the schema is small.
- **Cost:** Row-to-object mapping and result types are written by hand.

### 9. Current salary stored on the employee row as well as in the history
- **Why:** The list page filters, sorts and aggregates on current salary constantly. Reading one column is simpler and faster than finding the latest history row per employee in every query.
- **Cost:** The two could drift apart. This is prevented by having exactly one service function that changes a salary, which writes both in a single transaction, and by an integration test that checks they agree.

### 10. Routes, services and repositories as separate layers
- **Why:** Business rules can be unit-tested without HTTP or a database, which is what keeps the tests fast and deterministic.
- **Cost:** More files than putting queries in route handlers.

### 11. Session as a JWT in an HttpOnly cookie
- **Why:** The API runs as serverless functions with no shared memory, so a stateless token fits. An HttpOnly cookie cannot be read by page scripts, unlike a token in local storage, and the app and API share an origin so the cookie needs no cross-site handling.
- **Cost:** A token cannot be revoked before it expires; the 8-hour lifetime bounds this.

### 12. One Vercel project serving both the React app and the API
- **Why:** A single origin removes CORS configuration and keeps the cookie first-party. One deployment to manage.
- **Cost:** Express runs as a serverless function, so there are cold starts and no long-lived process.

### 13. Supabase connection pooler between the API and PostgreSQL
- **Why:** Each serverless instance opens its own connections; without pooling a burst of requests can exhaust the database's connection limit.
- **Cost:** The pooler's transaction mode does not support session-level features such as named prepared statements, which this app does not use.

### 14. Offset pagination with a total count
- **Why:** The HR Manager needs page numbers and a result count. At 10,000 rows, offset paging has no measurable cost.
- **Cost:** It would slow down on very deep pages of a much larger table; cursor paging would be the change to make then.

### 15. Insights computed on request
- **Why:** Aggregating 10,000 rows takes milliseconds, and figures are always current after an edit.
- **Cost:** At a much larger scale this would need a materialised view or cache.

### 16. Money as `NUMERIC` in the database and strings in JSON
- **Why:** Floating-point numbers cannot represent decimal amounts exactly. All arithmetic on money happens in PostgreSQL.
- **Cost:** The UI parses strings for display and charting.

### 17. Unit tests use fakes; a separate integration suite uses real PostgreSQL
- **Why:** The default test run needs no setup and finishes in seconds. But the median and grouping logic lives in SQL, which a fake cannot exercise, so a smaller suite runs against a real database.
- **Cost:** The integration suite needs a network connection and its own Supabase test database, so it is slower than the unit tests and is not part of the default run.
