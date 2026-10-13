-- One award per department (the lead, 12 Oct 2026; ADR 0021): an award department runs a single
-- award, and a new award needs a new award department. Generated with `prisma migrate diff`; the
-- check before it was added by hand.

-- A database that already has a department with two awards (possible before this decision) stops
-- here with a clear message instead of a bare unique-index error. Production has no data yet; a
-- local database is reset (`npm run db:reset`, then `npm run db:seed`).
DO $$
DECLARE
  crowded text;
BEGIN
  SELECT string_agg(d.name::text, ', ') INTO crowded
  FROM departments d
  WHERE (SELECT count(*) FROM awards a WHERE a."departmentId" = d.id) > 1;
  IF crowded IS NOT NULL THEN
    RAISE EXCEPTION 'One award per department: these departments have more than one award: %. Reset the local database, or move the extra awards to new departments first.', crowded;
  END IF;
END;
$$;

-- DropIndex
DROP INDEX "awards_departmentId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "awards_departmentId_key" ON "awards"("departmentId");
