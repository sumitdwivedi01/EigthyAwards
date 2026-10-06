-- Runs once, when the PostgreSQL volume is first created.
-- A separate database for automated tests, so tests never touch development data.
CREATE DATABASE awards_test OWNER awards;

-- Scratch database Prisma uses to compare migrations with the schema (drift checks).
CREATE DATABASE awards_shadow OWNER awards;
