# API Documentation

This document describes the API structure for Nexus.

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

Most endpoints require authentication. Include authentication token in headers:

```
Authorization: Bearer <token>
```

## Endpoints

### Health Check

#### GET /api/health

Check application health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-10T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0"
}
```

### Version

#### GET /api/version

Get application version information.

**Response:**
```json
{
  "version": "1.0.0",
  "build": "2024-01-10T12:00:00.000Z",
  "environment": "production"
}
```

## Skills API

### GET /api/skills

Get all skills for the authenticated user.

**Response:**
```json
[
  {
    "id": "1",
    "name": "React Development",
    "level": "advanced",
    "category": "Technical",
    "progress": 85,
    "verified": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-10T00:00:00.000Z"
  }
]
```

### POST /api/skills

Create a new skill.

**Request Body:**
```json
{
  "name": "TypeScript",
  "level": "intermediate",
  "category": "Technical",
  "progress": 60,
  "description": "TypeScript development skills",
  "tags": ["programming", "typescript"]
}
```

### PUT /api/skills/:id

Update a skill.

**Request Body:**
```json
{
  "progress": 70,
  "level": "advanced"
}
```

### DELETE /api/skills/:id

Delete a skill.

## Authentication API

### POST /api/auth/login

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST /api/auth/register

Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

### POST /api/auth/logout

Logout current session.

### POST /api/auth/forgot-password

Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### POST /api/auth/reset-password

Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token",
  "newPassword": "newpassword123"
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- Authentication endpoints: 5 requests per minute
- Other endpoints: 100 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## Pagination

List endpoints support pagination:

```
GET /api/skills?page=1&limit=20
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Filtering and Sorting

List endpoints support filtering and sorting:

```
GET /api/skills?category=Technical&level=advanced&sort=progress&order=desc
```

## Webhooks

Webhooks can be configured to receive events:

- `skill.created`
- `skill.updated`
- `skill.deleted`
- `user.registered`
- `verification.completed`

---

*Note: This is a mock API structure. When the backend is implemented, these endpoints will be available.*
