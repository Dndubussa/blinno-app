# Installing Supabase CLI

## Option 1: Install Scoop First, Then Supabase CLI

### Step 1: Install Scoop (Windows Package Manager)

Open PowerShell as Administrator and run:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex
```

### Step 2: Install Supabase CLI via Scoop

```powershell
scoop bucket add supabase https://github.com/supabase/supabase-scoop-bucket.git
scoop install supabase
```

### Step 3: Verify Installation

```powershell
supabase --version
```

---

## Option 2: Direct Download (Easier)

1. Go to: https://github.com/supabase/cli/releases
2. Download the latest Windows executable (`.exe` file)
3. Extract and add to your PATH, or run directly

---

## Option 3: Use Supabase Dashboard (No Installation Needed)

**This is the easiest method - no CLI installation required!**

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Navigate to SQL Editor
4. Copy and paste each migration file content
5. Run them in order

See `MIGRATION_INSTRUCTIONS.md` for detailed steps.

---

## After Installing CLI

Once Supabase CLI is installed, you can run migrations with:

```powershell
cd "G:\SAAS PLATFORMS\BLINNO"
supabase link --project-ref voxovqhyptopundvbtkc
supabase db push
```

