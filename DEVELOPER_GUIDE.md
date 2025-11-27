# BLINNO Developer Guide

This guide provides comprehensive information for developers working on the BLINNO platform.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Development Environment](#development-environment)
5. [Frontend Development](#frontend-development)
6. [Backend Development](#backend-development)
7. [Database](#database)
8. [Authentication](#authentication)
9. [API Integration](#api-integration)
10. [Testing](#testing)
11. [Deployment](#deployment)
12. [Contributing](#contributing)
13. [Best Practices](#best-practices)

## Project Overview

BLINNO is a comprehensive SaaS platform connecting creators, sellers, and service providers with customers worldwide. The platform includes features for marketplace, services, events, music, education, and more.

## Technology Stack

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Framework**: Node.js with Express
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Email**: Resend
- **Payments**: Click Pesa

### Infrastructure
- **Hosting**: (To be determined)
- **Database**: Supabase
- **Storage**: Supabase Storage
- **Email**: Resend
- **Payments**: Click Pesa
- **Monitoring**: Sentry (implemented)
- **Analytics**: (To be implemented)

## Project Structure

```
BLINNO/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── utils/           # Utility functions
│   │   ├── scripts/         # Utility scripts
│   │   └── server.ts        # Main server file
│   ├── package.json
│   └── tsconfig.json
├── src/
│   ├── assets/              # Static assets
│   ├── components/          # React components
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom hooks
│   ├── integrations/        # Third-party integrations
│   ├── lib/                 # Utility libraries
│   ├── pages/               # Page components
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── public/                  # Public assets
├── supabase/                # Supabase configuration
│   └── migrations/          # Database migrations
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Development Environment

### Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Git**
4. **Supabase CLI**
5. **Code Editor** (VS Code recommended)

### Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/blinno.git
   cd blinno
   ```

2. **Install Dependencies**
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd backend
   npm install
   cd ..
   ```

3. **Environment Configuration**
   Create `.env` files in both root and backend directories:
   
   **Root `.env`:**
   ```env
   VITE_API_URL=http://localhost:3001/api
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

   **Backend `.env`:**
   ```env
   NODE_ENV=development
   PORT=3001
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   RESEND_API_KEY=your-resend-api-key
   CLICKPESA_API_KEY=your-clickpesa-api-key
   CLICKPESA_PUBLIC_KEY=your-clickpesa-public-key
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1: Frontend
   npm run dev
   
   # Terminal 2: Backend
   cd backend
   npm run dev
   ```

## Frontend Development

### Component Structure

Components follow a consistent structure:

```tsx
// ExampleComponent.tsx
import React from 'react';
import { Button } from '@/components/ui/button';

interface ExampleComponentProps {
  title: string;
  onAction: () => void;
}

export function ExampleComponent({ title, onAction }: ExampleComponentProps) {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <Button onClick={onAction}>Click Me</Button>
    </div>
  );
}
```

### State Management

The application uses React Context for state management:

```tsx
// ExampleContext.tsx
import React, { createContext, useContext, useState } from 'react';

interface ExampleContextType {
  value: string;
  setValue: (value: string) => void;
}

const ExampleContext = createContext<ExampleContextType | undefined>(undefined);

export function ExampleProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState('');

  return (
    <ExampleContext.Provider value={{ value, setValue }}>
      {children}
    </ExampleContext.Provider>
  );
}

export function useExample() {
  const context = useContext(ExampleContext);
  if (!context) {
    throw new Error('useExample must be used within ExampleProvider');
  }
  return context;
}
```

### API Integration

API calls are handled through a centralized client:

```ts
// src/lib/api.ts
import axios from 'axios';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Add auth token to requests
    axios.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });
  }

  setToken(token: string) {
    this.token = token;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await axios.get(`${this.baseURL}${endpoint}`);
    return response.data;
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await axios.post(`${this.baseURL}${endpoint}`, data);
    return response.data;
  }
}

export const api = new ApiClient(import.meta.env.VITE_API_URL);
```

### Routing

Routing is handled with React Router:

```tsx
// App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
    </Router>
  );
}
```

## Backend Development

### Route Structure

Routes follow a consistent pattern:

```ts
// routes/example.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/example
router.get('/', async (req, res) => {
  try {
    // Business logic
    const data = await getData();
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/example (protected)
router.post('/', authenticate, async (req, res) => {
  try {
    // Business logic with authentication
    const data = await createData(req.body, req.userId);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Middleware

Custom middleware for authentication and validation:

```ts
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.userId = user.id;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
```

### Services

Business logic is encapsulated in service files:

```ts
// services/exampleService.ts
import { supabase } from '../config/supabase';

export async function getData(userId: string) {
  const { data, error } = await supabase
    .from('example_table')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return data;
}

export async function createData(data: any, userId: string) {
  const { data: result, error } = await supabase
    .from('example_table')
    .insert({
      ...data,
      user_id: userId,
      created_at: new Date().toISOString()
    })
    .select();

  if (error) {
    throw new Error(`Database error: ${error.message}`);
  }

  return result[0];
}
```

## Database

### Supabase Integration

The platform uses Supabase for database operations:

```ts
// config/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Database Migrations

Migrations are stored in `supabase/migrations/`:

```sql
-- 20230101000000_create_example_table.sql
CREATE TABLE IF NOT EXISTS example_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own data"
  ON example_table FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data"
  ON example_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## Authentication

### Supabase Auth

Authentication is handled through Supabase Auth:

```ts
// Frontend auth context
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});
```

### Role-Based Access

User roles are managed through a separate table:

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'creator', 'seller', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Integration

### REST API

The backend exposes a REST API:

```ts
// Frontend API client usage
import { api } from '@/lib/api';

// Get products
const products = await api.getProducts();

// Create product
const newProduct = await api.createProduct({
  title: 'New Product',
  price: 50000
});
```

### Error Handling

Consistent error handling across frontend and backend:

```ts
// Frontend error handling
try {
  const result = await api.someMethod();
} catch (error: any) {
  if (error.response?.status === 401) {
    // Handle authentication error
    navigate('/login');
  } else if (error.response?.status === 403) {
    // Handle authorization error
    showError('Access denied');
  } else {
    // Handle other errors
    showError(error.message || 'An error occurred');
  }
}
```

## Testing

### Frontend Testing

Frontend testing uses Vitest and React Testing Library:

```ts
// ExampleComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ExampleComponent } from './ExampleComponent';

describe('ExampleComponent', () => {
  it('renders correctly', () => {
    render(<ExampleComponent title="Test" onAction={jest.fn()} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls onAction when button is clicked', () => {
    const mockAction = jest.fn();
    render(<ExampleComponent title="Test" onAction={mockAction} />);
    fireEvent.click(screen.getByText('Click Me'));
    expect(mockAction).toHaveBeenCalled();
  });
});
```

### Backend Testing

Backend testing uses Jest and Supertest:

```ts
// routes/example.test.ts
import request from 'supertest';
import express from 'express';
import exampleRoutes from './example';

const app = express();
app.use('/api/example', exampleRoutes);

describe('Example Routes', () => {
  it('GET /api/example returns data', async () => {
    const response = await request(app).get('/api/example');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.any(Array));
  });
});
```

### Test Coverage

Aim for the following test coverage:
- Unit tests: 80%+
- Integration tests: 70%+
- End-to-end tests: 50%+

## Deployment

### Frontend Deployment

Build and deploy the frontend:

```bash
# Build for production
npm run build

# Serve built files
npm run preview
```

### Backend Deployment

Build and deploy the backend:

```bash
# Build TypeScript
cd backend
npm run build

# Start server
npm start
```

### Environment Configuration

Production environment variables:

```env
# Frontend
VITE_API_URL=https://www.blinno.app/api
VITE_SUPABASE_URL=production-supabase-url
VITE_SUPABASE_ANON_KEY=production-supabase-anon-key

# Backend
NODE_ENV=production
PORT=3001
SUPABASE_URL=production-supabase-url
SUPABASE_SERVICE_ROLE_KEY=production-service-role-key
```

## Contributing

### Git Workflow

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Write tests
5. Commit changes
6. Push to your fork
7. Create a pull request

### Code Review Process

All pull requests must:
1. Pass all tests
2. Follow coding standards
3. Include documentation updates
4. Be reviewed by at least one team member

### Pull Request Template

```
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass
```

## Best Practices

### Code Quality

1. **TypeScript**: Use strong typing throughout
2. **ESLint**: Follow configured linting rules
3. **Prettier**: Maintain consistent code formatting
4. **Documentation**: Comment complex logic
5. **Naming**: Use descriptive variable and function names

### Performance

1. **Lazy Loading**: Use React.lazy for code splitting
2. **Memoization**: Use useMemo and useCallback appropriately
3. **Efficient Queries**: Optimize database queries
4. **Caching**: Implement caching where appropriate
5. **Bundle Optimization**: Minimize bundle size

### Security

1. **Input Validation**: Validate all user inputs
2. **Authentication**: Implement proper auth checks
3. **Authorization**: Enforce role-based access
4. **SQL Injection**: Use parameterized queries
5. **XSS Prevention**: Sanitize user-generated content

### Accessibility

1. **Semantic HTML**: Use proper HTML elements
2. **ARIA Labels**: Add appropriate ARIA attributes
3. **Keyboard Navigation**: Ensure full keyboard support
4. **Screen Readers**: Test with screen readers
5. **Color Contrast**: Maintain proper contrast ratios

### Error Handling

1. **Graceful Degradation**: Handle errors gracefully
2. **User Feedback**: Provide clear error messages
3. **Logging**: Log errors for debugging
4. **Monitoring**: Implement error tracking (Sentry)
5. **Recovery**: Provide ways to recover from errors

### Testing

1. **Test Coverage**: Maintain high test coverage
2. **Edge Cases**: Test boundary conditions
3. **Integration**: Test component interactions
4. **Performance**: Monitor performance impacts
5. **Regression**: Prevent regression with tests

---

This developer guide is a living document. Please contribute updates and improvements as the project evolves.