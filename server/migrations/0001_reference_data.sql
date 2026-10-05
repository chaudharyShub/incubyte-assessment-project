-- Up Migration

CREATE TABLE currencies (
  code        char(3) PRIMARY KEY,
  name        text NOT NULL,
  rate_to_inr numeric(12, 6) NOT NULL CHECK (rate_to_inr > 0)
);

CREATE TABLE countries (
  code          char(2) PRIMARY KEY,
  name          text NOT NULL UNIQUE,
  currency_code char(3) NOT NULL REFERENCES currencies (code)
);

CREATE TABLE departments (
  id   smallint PRIMARY KEY,
  name text NOT NULL UNIQUE
);

-- rank orders levels by seniority, lowest first.
CREATE TABLE levels (
  id   smallint PRIMARY KEY,
  name text NOT NULL UNIQUE,
  rank smallint NOT NULL UNIQUE
);

-- The app reaches the database as the table owner, which bypasses row level
-- security. Enabling it with no policies shuts out every other role, including
-- the ones behind Supabase's auto-generated REST API.
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

-- Down Migration

DROP TABLE levels;
DROP TABLE departments;
DROP TABLE countries;
DROP TABLE currencies;
