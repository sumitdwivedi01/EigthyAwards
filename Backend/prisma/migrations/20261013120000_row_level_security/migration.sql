-- Step 1.5: lock every table against Supabase's automatic table API (GAPS G-B04).
-- Supabase publishes the public schema through its Data API, where anyone holding the project's
-- public key could read a table that has no row-level security. The owner should also switch the
-- Data API off in the dashboard; this is the second lock. Row-level security with no policies
-- refuses everyone except the tables' owner, which is the role the API and the migrations connect
-- as, so the platform itself is unaffected (owners bypass RLS unless it is forced).
-- Every migration that creates a table must enable it too: tests/database-rules.test.ts checks.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END;
$$;
