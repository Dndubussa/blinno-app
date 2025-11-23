# Quick Setup Instructions

## Step 1: Set Up Database

### Option A: Using the Setup Script (Windows PowerShell)

1. Open PowerShell in the project root directory
2. Run:
   ```powershell
   .\setup-database.ps1
   ```
3. Follow the prompts to enter your PostgreSQL credentials

### Option B: Manual Setup

1. **Find psql.exe**:
   - **Standard PostgreSQL**: `C:\Program Files\PostgreSQL\[version]\bin\psql.exe`
   - **EDB PostgreSQL**: `C:\Program Files\edb\as\[version]\bin\psql.exe`
   - Or add PostgreSQL bin directory to your PATH

2. **Create the database**:
   ```bash
   psql -U postgres
   ```
   Then in psql:
   ```sql
   CREATE DATABASE blinno;
   \q
   ```

3. **Run the schema**:
   ```bash
   psql -U postgres -d blinno -f backend/src/db/schema.sql
   ```

## Step 2: Configure Backend

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create .env file**:
   ```bash
   copy .env.example .env
   ```

4. **Edit .env** with your database credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=blinno
   DB_USER=postgres
   DB_PASSWORD=your_password_here
   
   JWT_SECRET=your_super_secret_jwt_key_change_this
   JWT_EXPIRES_IN=7d
   
   PORT=3001
   CORS_ORIGIN=http://localhost:5173
   ```

## Step 3: Start Backend

```bash
cd backend
npm run dev
```

You should see:
```
✅ Connected to PostgreSQL database
🚀 Server running on port 3001
```

## Step 4: Configure Frontend

1. **Create/update .env** in the root directory:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

2. **Install dependencies** (if not done):
   ```bash
   npm install
   ```

## Step 5: Start Frontend

```bash
npm run dev
```

## Step 6: Test

1. Open http://localhost:5173
2. Try registering a new user
3. Try logging in
4. Browse the marketplace

## Troubleshooting

### psql not found
- **Standard PostgreSQL**: Add bin directory to PATH:
  - `C:\Program Files\PostgreSQL\[version]\bin`
- **EDB PostgreSQL**: Add bin directory to PATH:
  - `C:\Program Files\edb\as\[version]\bin`
- Or use full path to psql.exe in the setup script

### Database connection errors
- Verify PostgreSQL service is running
- Check credentials in backend/.env
- Test connection: `psql -U postgres -d blinno`

### Port already in use
- Change PORT in backend/.env
- Update VITE_API_URL in frontend .env

### CORS errors
- Ensure CORS_ORIGIN in backend/.env matches frontend URL
- Default: `http://localhost:5173`

