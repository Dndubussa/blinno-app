# Files to Delete After Migration

After successfully migrating to the custom Node.js backend, you can safely delete these Supabase-related files and directories:

## Directories to Delete

1. **`src/integrations/supabase/`** - Entire directory
   - `client.ts`
   - `types.ts`

2. **`supabase/`** - Entire directory (if not needed)
   - `config.toml`
   - `migrations/` (all SQL files)

## Environment Variables to Remove

From `.env` file (root directory):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Note

Keep the migration files (`supabase/migrations/`) if you need to reference the original schema, but they're no longer needed for the application to run.

## After Deletion

1. Restart your development server
2. Clear browser cache/localStorage if needed
3. Verify all features work with the new backend

