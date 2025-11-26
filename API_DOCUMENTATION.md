# BLINNO API Documentation

This document provides comprehensive documentation for the BLINNO platform API.

## Table of Contents

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Endpoints](#endpoints)
   - [Authentication](#authentication-endpoints)
   - [User Profiles](#user-profile-endpoints)
   - [Products](#product-endpoints)
   - [Services](#service-endpoints)
   - [Events](#event-endpoints)
   - [Courses](#course-endpoints)
   - [Music](#music-endpoints)
   - [Orders](#order-endpoints)
   - [Payments](#payment-endpoints)
   - [Messages](#message-endpoints)
6. [Webhooks](#webhooks)
7. [SDKs](#sdks)
8. [Best Practices](#best-practices)

## API Overview

The BLINNO API provides programmatic access to platform features including user management, product listings, service bookings, event management, and more.

### Base URL

```
https://www.blinno.app/api
```

### Supported Formats

- Request/Response: JSON
- Authentication: Bearer Token (JWT)

### HTTP Methods

- `GET` - Retrieve resources
- `POST` - Create resources
- `PUT` - Update resources
- `DELETE` - Delete resources

## Authentication

### Registration

Register a new user account.

```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "displayName": "John Doe",
  "role": "user"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "created_at": "2023-01-01T00:00:00Z"
  },
  "token": "jwt-token"
}
```

### Login

Authenticate a user and obtain an access token.

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com"
  },
  "token": "jwt-token"
}
```

### Password Reset

Request a password reset email.

```http
POST /auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

### Token Refresh

Refresh an expired access token.

```http
POST /auth/refresh
```

**Headers:**
```
Authorization: Bearer refresh-token
```

**Response:**
```json
{
  "token": "new-jwt-token"
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Anonymous requests**: 100 requests per 15 minutes
- **Authenticated requests**: 1000 requests per 15 minutes

Exceeding these limits will result in a `429 Too Many Requests` response.

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests.

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": "Error message describing what went wrong"
}
```

## Endpoints

### Authentication Endpoints

#### Register User
```http
POST /auth/register
```

#### Login User
```http
POST /auth/login
```

#### Get Current User
```http
GET /auth/me
```

**Headers:**
```
Authorization: Bearer jwt-token
```

#### Forgot Password
```http
POST /auth/forgot-password
```

#### Reset Password
```http
POST /auth/reset-password
```

### User Profile Endpoints

#### Get User Profile
```http
GET /profiles/{userId}
```

#### Get Current User Profile
```http
GET /profiles/me
```

**Headers:**
```
Authorization: Bearer jwt-token
```

#### Update Profile
```http
PUT /profiles/me
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: multipart/form-data
```

**Form Data:**
- `displayName` (string)
- `bio` (string)
- `location` (string)
- `website` (string)
- `socialLinks` (JSON string)
- `phone` (string)
- `isPublic` (boolean)
- `avatar` (file)

#### Update User Preferences
```http
PUT /profiles/preferences
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "currency": "TZS",
  "language": "en",
  "country": "TZ"
}
```

### Product Endpoints

#### List Products
```http
GET /products
```

**Query Parameters:**
- `category` (string)
- `location` (string)
- `minPrice` (number)
- `maxPrice` (number)
- `search` (string)
- `limit` (number, default: 20)
- `offset` (number, default: 0)

#### Get Product
```http
GET /products/{productId}
```

#### Create Product
```http
POST /products
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: multipart/form-data
```

**Form Data:**
- `title` (string, required)
- `description` (string, required)
- `price` (number, required)
- `category` (string, required)
- `location` (string)
- `stockQuantity` (number)
- `images` (files, up to 5)

#### Update Product
```http
PUT /products/{productId}
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: multipart/form-data
```

#### Delete Product
```http
DELETE /products/{productId}
```

**Headers:**
```
Authorization: Bearer jwt-token
```

### Service Endpoints

#### List Services
```http
GET /services
```

**Query Parameters:**
- `category` (string)
- `location` (string)
- `search` (string)
- `limit` (number, default: 20)
- `offset` (number, default: 0)

#### Get Service
```http
GET /services/{serviceId}
```

#### Create Service
```http
POST /services
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Service Title",
  "description": "Service Description",
  "price": 50000,
  "category": "consulting",
  "location": "Dar es Salaam",
  "duration": 60,
  "availability": {
    "monday": ["09:00-17:00"],
    "tuesday": ["09:00-17:00"]
  }
}
```

#### Update Service
```http
PUT /services/{serviceId}
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: application/json
```

#### Delete Service
```http
DELETE /services/{serviceId}
```

**Headers:**
```
Authorization: Bearer jwt-token
```

### Event Endpoints

#### List Events
```http
GET /events
```

**Query Parameters:**
- `category` (string)
- `location` (string)
- `startDate` (ISO date)
- `endDate` (ISO date)
- `search` (string)
- `limit` (number, default: 20)
- `offset` (number, default: 0)

#### Get Event
```http
GET /events/{eventId}
```

#### Create Event
```http
POST /events
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: multipart/form-data
```

**Form Data:**
- `title` (string, required)
- `description` (string, required)
- `startDate` (ISO date, required)
- `endDate` (ISO date)
- `location` (string, required)
- `venueName` (string, required)
- `ticketTypes` (JSON string, required)
- `images` (files, up to 5)

#### Update Event
```http
PUT /events/{eventId}
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: multipart/form-data
```

#### Delete Event
```http
DELETE /events/{eventId}
```

**Headers:**
```
Authorization: Bearer jwt-token
```

### Course Endpoints

#### List Courses
```http
GET /courses
```

**Query Parameters:**
- `category` (string)
- `search` (string)
- `limit` (number, default: 20)
- `offset` (number, default: 0)

#### Get Course
```http
GET /courses/{courseId}
```

#### Create Course
```http
POST /courses
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Course Title",
  "description": "Course Description",
  "category": "technology",
  "price": 75000,
  "learningObjectives": ["Objective 1", "Objective 2"],
  "prerequisites": "Required knowledge"
}
```

#### Update Course
```http
PUT /courses/{courseId}
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: application/json
```

#### Delete Course
```http
DELETE /courses/{courseId}
```

**Headers:**
```
Authorization: Bearer jwt-token
```

### Music Endpoints

#### List Tracks
```http
GET /music/tracks
```

**Query Parameters:**
- `artist` (string)
- `genre` (string)
- `search` (string)
- `limit` (number, default: 20)
- `offset` (number, default: 0)

#### Get Track
```http
GET /music/tracks/{trackId}
```

#### Upload Track
```http
POST /music/tracks
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: multipart/form-data
```

**Form Data:**
- `title` (string, required)
- `artist` (string, required)
- `album` (string)
- `genre` (string, required)
- `price` (number, required)
- `audioFile` (file, required)
- `coverArt` (file)

#### Update Track
```http
PUT /music/tracks/{trackId}
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: multipart/form-data
```

#### Delete Track
```http
DELETE /music/tracks/{trackId}
```

**Headers:**
```
Authorization: Bearer jwt-token
```

### Order Endpoints

#### List Orders
```http
GET /orders
```

**Headers:**
```
Authorization: Bearer jwt-token
```

**Query Parameters:**
- `status` (string: pending, confirmed, shipped, delivered, cancelled)
- `limit` (number, default: 20)
- `offset` (number, default: 0)

#### Get Order
```http
GET /orders/{orderId}
```

**Headers:**
```
Authorization: Bearer jwt-token
```

#### Create Order
```http
POST /orders
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [
    {
      "productId": "product-id",
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "name": "John Doe",
    "address": "123 Main St",
    "city": "Dar es Salaam",
    "region": "Dar es Salaam",
    "postalCode": "12345",
    "country": "TZ"
  }
}
```

#### Update Order Status
```http
PUT /orders/{orderId}/status
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "shipped"
}
```

### Payment Endpoints

#### Create Payment Intent
```http
POST /payments/intent
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 50000,
  "currency": "TZS",
  "orderId": "order-id"
}
```

#### Process Payment
```http
POST /payments/process
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "paymentMethod": "clickpesa",
  "paymentIntentId": "intent-id",
  "redirectUrl": "https://www.blinno.app/payment-success"
}
```

#### Get Payment Status
```http
GET /payments/{paymentId}
```

**Headers:**
```
Authorization: Bearer jwt-token
```

### Message Endpoints

#### List Conversations
```http
GET /messages/conversations
```

**Headers:**
```
Authorization: Bearer jwt-token
```

**Query Parameters:**
- `limit` (number, default: 20)
- `offset` (number, default: 0)

#### Get Messages
```http
GET /messages/conversations/{conversationId}
```

**Headers:**
```
Authorization: Bearer jwt-token
```

**Query Parameters:**
- `limit` (number, default: 50)
- `before` (message ID for pagination)

#### Send Message
```http
POST /messages/send
```

**Headers:**
```
Authorization: Bearer jwt-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "recipientId": "user-id",
  "content": "Hello, how are you?"
}
```

#### Mark as Read
```http
PUT /messages/{messageId}/read
```

**Headers:**
```
Authorization: Bearer jwt-token
```

## Webhooks

BLINNO provides webhooks for real-time notifications about events in the system.

### Webhook Events

| Event | Description |
|-------|-------------|
| `order.created` | A new order has been created |
| `order.updated` | An order status has been updated |
| `payment.succeeded` | A payment has been successfully processed |
| `payment.failed` | A payment has failed |
| `user.registered` | A new user has registered |

### Webhook Configuration

To receive webhooks, configure your webhook URL in your account settings:

1. Go to your dashboard
2. Navigate to "Webhook Settings"
3. Enter your webhook URL
4. Select which events you want to receive
5. Save your settings

### Webhook Payload

Webhook payloads are sent as JSON with the following structure:

```json
{
  "id": "webhook-id",
  "event": "order.created",
  "data": {
    // Event-specific data
  },
  "timestamp": "2023-01-01T00:00:00Z"
}
```

### Webhook Security

Webhooks are signed with a secret key to verify authenticity. Always verify the signature before processing webhook data.

## SDKs

BLINNO provides SDKs for popular programming languages to make API integration easier.

### JavaScript SDK

```javascript
import { BlinnoClient } from '@blinno/sdk';

const client = new BlinnoClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://www.blinno.app/api'
});

// Get products
const products = await client.products.list();

// Create a product
const newProduct = await client.products.create({
  title: 'New Product',
  description: 'Product description',
  price: 50000,
  category: 'electronics'
});
```

### Python SDK

```python
from blinno import BlinnoClient

client = BlinnoClient(
    api_key='your-api-key',
    base_url='https://www.blinno.app/api'
)

# Get products
products = client.products.list()

# Create a product
new_product = client.products.create(
    title='New Product',
    description='Product description',
    price=50000,
    category='electronics'
)
```

## Best Practices

### 1. Authentication
- Always use HTTPS for API requests
- Store tokens securely
- Refresh tokens before they expire
- Handle authentication errors gracefully

### 2. Rate Limiting
- Implement exponential backoff for rate-limited requests
- Cache responses when appropriate
- Batch requests when possible

### 3. Error Handling
- Always check HTTP status codes
- Parse error responses for detailed information
- Implement retry logic for transient errors
- Log errors for debugging

### 4. Data Validation
- Validate data before sending requests
- Handle required and optional fields appropriately
- Use proper data types
- Sanitize user input

### 5. Security
- Never expose API keys in client-side code
- Use environment variables for secrets
- Validate webhook signatures
- Implement proper CORS policies

### 6. Performance
- Use pagination for large datasets
- Implement caching strategies
- Minimize the number of API calls
- Use appropriate query parameters to filter data

## Support

For API-related questions or issues:

- Email: api-support@blinno.app
- Documentation: [https://docs.blinno.app](https://docs.blinno.app)
- Status Page: [https://status.blinno.app](https://status.blinno.app)

---

This API documentation is subject to change. Always refer to the latest version for the most up-to-date information.