# BLINNO Backend API

Node.js + Express + PostgreSQL backend for the BLINNO platform.

## Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up PostgreSQL database:**
   ```bash
   # Create database
   createdb blinno

   # Run schema
   psql -d blinno -f src/db/schema.sql
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Profiles
- `GET /api/profiles/:userId` - Get profile
- `PUT /api/profiles/me` - Update own profile

### Portfolios
- `GET /api/portfolios` - List portfolios
- `GET /api/portfolios/:id` - Get portfolio
- `POST /api/portfolios` - Create portfolio
- `PUT /api/portfolios/:id` - Update portfolio
- `DELETE /api/portfolios/:id` - Delete portfolio

### Products (Marketplace)
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Cart
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove from cart
- `POST /api/cart/checkout` - Checkout

### Messages
- `GET /api/messages/conversations` - Get conversations
- `GET /api/messages/:userId` - Get messages with user
- `POST /api/messages` - Send message
- `GET /api/messages/unread/count` - Get unread count

### Bookings
- `GET /api/bookings` - Get bookings
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking

## Authentication

All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## File Uploads

Uploaded files are stored in the `uploads/` directory and served at `/api/uploads/`.

