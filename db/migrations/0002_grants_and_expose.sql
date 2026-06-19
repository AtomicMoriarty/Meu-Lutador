-- Expose the meu_lutador schema through PostgREST and grant the standard
-- Supabase roles access, so the ingestion script can load data over HTTPS
-- (direct Postgres ports are blocked in the build environment).

GRANT USAGE ON SCHEMA meu_lutador TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA meu_lutador TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA meu_lutador TO service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA meu_lutador TO service_role;

-- Read-only for the anonymous/auth roles (future frontend reads).
GRANT SELECT ON ALL TABLES IN SCHEMA meu_lutador TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA meu_lutador
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA meu_lutador
  GRANT SELECT ON TABLES TO anon, authenticated;

-- Add meu_lutador to the schemas PostgREST serves, then reload its config.
ALTER ROLE authenticator
  SET pgrst.db_schemas = 'public, graphql_public, meu_lutador';
NOTIFY pgrst, 'reload config';
