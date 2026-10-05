# Prompt Log

A verbatim record of the prompts given to the AI tool (Claude Code) while building this project, in chronological order.

---

## Prompt 1 — 2026-10-05

> There is a file named "instructions.md" in this folder, and I want you to go through it. Before proceeding for the development, I want you to come up with the process flow, decisions, like what and how we will be proceeding for the solution.

## Prompt 2 — 2026-10-05

> Couple of instructions I want to give you before we start: - ask me before making any commit, - don't make any assumptions on your own, rather ask me if in doubt, - don't include anything which is not mentioned in the instructions, if you think about adding something, ask me first. One more thing: I want you to create a document which save all my prompts which I am giving to you, including the previous one I've already given plus this one as well.

## Prompt 3 — 2026-10-05

> - Include login/signup even if not mentioned in the instructions. - Choose Typescript for both frontend and backend. - Don't include CSV export because we are seeding the data ourself anyway. - Don't include "salary change history", "multiple currenty conversion". - For hosting provider I will prefer Vercel. - For questions, I like the points you suggested and want you to go with them. - For the employee fields, go with the points you suggested, I found them pretty well.

### Answers to follow-up questions — 2026-10-05

| Question asked by the AI | My answer |
|---|---|
| With no currency conversion, how should salaries from different countries be stored so that totals and averages across countries make sense? | Keep the currenty in INR only. |
| Vercel does not run PostgreSQL itself. Where should the database live? | Supabase |
| Who should be allowed to sign up on the deployed app? | Login only, seeded account |
| Which supporting tools do you approve? (Ant Design + Recharts / Monorepo layout / Vitest test stack / Raw SQL + migrations) | Monorepo layout, Vitest test stack, Raw SQL + migrations |

## Prompt 4 — 2026-10-05

> - I want you to choose Tailwind css rather than other libraries. I like it personally. - Go with implementing the charts and Recharts is acceptable. - Before initializing, I want to make a slight change in my currency decision. I would like to go with the salary change history and  currency conversion as well as it is mentioned that the organization is managing salary for multiple countries. - After these, you can initiate the git initialization and commiting.

### Answers to follow-up questions — 2026-10-05

| Question asked by the AI | My answer |
|---|---|
| Each salary is stored in the employee's local currency. Which single currency should org-wide and cross-country figures be converted into? | INR |
| Where should the exchange rates come from? | Fixed seeded rates |
| Tailwind CSS is a styling framework rather than a component library, and the brief asks for a component library. How should the components be built? | Tailwind + shadcn/ui |

## Prompt 5 — 2026-10-05

> I have read the requirements.md file. Go ahead.

### Answers to follow-up questions — 2026-10-05

| Question asked by the AI | My answer |
|---|---|
| What should each salary change record store? (Amount, date and reason / Amount and date only) | Amount and date only |
| Which countries (each with its own currency) should the seed data use? | 5 countries: India (INR), United States (USD), United Kingdom (GBP), Germany (EUR), Singapore (SGD) |
| Which departments and levels should the seed data and filters use? | 5 depts, 4 levels. Departments: Engineering, Sales, Marketing, Finance, Human Resources. Levels: Junior, Mid, Senior, Manager |

## Prompt 6 — 2026-10-05

> 6. go with the libraries you have mentioned in this point. 7. I would like to go with supabase database.

### Answers to follow-up questions — 2026-10-05

| Question asked by the AI | My answer |
|---|---|
| What period does a salary amount cover? (Annual / Monthly) | Monthly |
| Which employees should the insights count? (Active only / Active and inactive) | Active only |
| What should happen to the country field after an employee is created? | Fixed after creation |
| Which of these remaining points do you approve? (Salary change date rule / Sort salary by INR / Supabase for local dev too / Commit the design docs) | Sort salary by INR, Supabase for local dev too, Commit the design docs, Salary change date rule |
