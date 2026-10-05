-- Up Migration

-- salary is the current monthly salary in the currency of the employee's
-- country. It always equals the latest salary_history row for the employee.
CREATE TABLE employees (
  id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL,
  country_code  char(2) NOT NULL REFERENCES countries (code),
  department_id smallint NOT NULL REFERENCES departments (id),
  level_id      smallint NOT NULL REFERENCES levels (id),
  job_title     text NOT NULL,
  hire_date     date NOT NULL,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  salary        numeric(14, 2) NOT NULL CHECK (salary > 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX employees_email_unique ON employees (lower(email));
CREATE INDEX employees_country_idx ON employees (country_code);
CREATE INDEX employees_department_idx ON employees (department_id);
CREATE INDEX employees_level_idx ON employees (level_id);
CREATE INDEX employees_status_idx ON employees (status);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Down Migration

DROP TABLE employees;
