# Migration Guide: Supabase to Custom Node.js Backend

This guide will help you migrate from Supabase to the new custom Node.js + PostgreSQL backend.

## Prerequisites

1. **PostgreSQL Database** (version 12+)
2. **Node.js** (version 18+)
3. **npm** or **yarn**

## Step 1: Set Up PostgreSQL Database

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # Windows (using Chocolatey)
   choco install postgresql

   # macOS (using Homebrew)
   brew install postgresql

   # Linux (Ubuntu/Debian)
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Create Database**:
   ```bash
   # Connect to PostgreSQL
   psql -U postgres

   # Create database
   CREATE DATABASE blinno;

   # Exit psql
   \q
   ```

3. **Run Schema**:
   ```bash
   psql -U postgres -d blinno -f backend/src/db/schema.sql
   ```

## Step 2: Set Up Backend

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   # Copy example env file
   cp .env.example .env

   # Edit .env with your settings:
   # - Database credentials
   # - JWT secret (generate a strong random string)
   # - Port (default: 3001)
   # - CORS origin (your frontend URL)
   ```

4. **Start backend server**:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

## Step 3: Update Frontend

1. **Add environment variable**:
   Create or update `.env` in the root directory:
   ```env
   VITE_API_URL=http://localhost:3001/api
   ```

2. **The frontend has already been updated** to use the new API client (`src/lib/api.ts`).

## Step 4: Remove Supabase Files

The following files/directories can be deleted:

- `src/integrations/supabase/` (entire directory)
- `supabase/` (entire directory)
- `.env` variables related to Supabase:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

## Step 5: Data Migration (If Needed)

If you have existing data in Supabase that needs to be migrated:

1. **Export data from Supabase**:
   - Use Supabase Dashboard > Database > Export
   - Or use `pg_dump` if you have direct database access

2. **Import to new database**:
   ```bash
   psql -U postgres -d blinno < exported_data.sql
   ```

3. **Update user passwords**:
   - User passwords are hashed differently
   - Users will need to reset passwords or you'll need to migrate password hashes

## Step 6: Update Environment Variables

### Backend (.env in backend/)
```env
PORT=3001
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=blinno
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d

UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,image/gif

CORS_ORIGIN=https://www.blinno.app
# For local development, use: http://localhost:5173
```

### Frontend (.env in root/)
```env
VITE_API_URL=https://www.blinno.app/api
# For local development, use: http://localhost:3001/api
```

## Step 7: Test the Migration

1. **Start backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend**:
   ```bash
   npm run dev
   ```

3. **Test key features**:
   - User registration
   - User login
   - View profiles
   - Create portfolios
   - Browse marketplace
   - Add to cart
   - Send messages

## API Endpoints

All API endpoints are now at `http://localhost:3001/api/`:

- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- **Profiles**: `/api/profiles/:userId`, `/api/profiles/me`
- **Portfolios**: `/api/portfolios`
- **Products**: `/api/products`
- **Cart**: `/api/cart`
- **Messages**: `/api/messages`
- **Bookings**: `/api/bookings`
- **Dashboards**: `/api/dashboards/:role/stats`
- **Freelancer**: `/api/freelancer/*`

## Differences from Supabase

1. **Authentication**:
   - Uses JWT tokens instead of Supabase sessions
   - Tokens stored in localStorage
   - No automatic token refresh (implement if needed)

2. **File Storage**:
   - Files stored locally in `backend/uploads/`
   - Served at `/api/uploads/`
   - Consider migrating to S3/Cloud Storage for production

3. **Real-time**:
   - No built-in real-time features
   - Consider adding WebSocket support if needed

4. **Database**:
   - Direct PostgreSQL access
   - No Row Level Security (RLS) - handled in application layer
   - Manual migrations instead of Supabase migrations

## Production Considerations

1. **Security**:
   - Use strong JWT secret
   - Enable HTTPS
   - Set up proper CORS
   - Use environment variables for secrets

2. **File Storage**:
   - Migrate to cloud storage (S3, Cloudinary, etc.)
   - Update upload middleware

3. **Database**:
   - Use connection pooling
   - Set up backups
   - Monitor performance

4. **Deployment**:
   - Use PM2 or similar for process management
   - Set up reverse proxy (nginx)
   - Configure SSL certificates

## Troubleshooting

### Database Connection Issues
- Check PostgreSQL is running: `pg_isready`
- Verify credentials in `.env`
- Check firewall settings

### CORS Errors
- Verify `CORS_ORIGIN` in backend `.env`
- Check frontend URL matches

### File Upload Issues
- Ensure `uploads/` directory exists and is writable
- Check file size limits
- Verify file types are allowed

### Authentication Issues
- Check JWT secret is set
- Verify token is being sent in headers
- Check token expiration

## Support

If you encounter issues:
1. Check backend logs
2. Verify database schema is correct
3. Ensure all environment variables are set
4. Test API endpoints directly (using Postman/curl)

