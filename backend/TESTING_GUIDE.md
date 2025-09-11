# Multi-Tenant SaaS Testing Guide

## Overview

This guide explains how to test the multi-tenant SaaS architecture of Innexora.

## Architecture

- **Main Database**: Stores hotel metadata, subdomains, and database URLs
- **Tenant Databases**: Each hotel has its own dedicated database
- **Subdomain Routing**: Hotels are accessed via subdomains (e.g., `marriott.innexora.app`)

## Setup for Testing

### 1. Environment Variables

Copy the example environment file and configure:

```bash
cp config/env.example .env
```

Update your `.env` file with appropriate database URLs:

```env
MONGODB_URI=mongodb://localhost:27017/innexora-main
SAMPLE_HOTEL_DB_URL=mongodb://localhost:27017/hotel-marriott
SAMPLE_HOTEL_DB_URL_2=mongodb://localhost:27017/hotel-budgetinn
```

### 2. Seed Main Database

Run the seed script to create sample hotels:

```bash
npm run seed:main
```

This creates two sample hotels:

- **Marriott Downtown** - Subdomain: `marriott`
- **Budget Inn Express** - Subdomain: `budgetinn`

### 3. Local Development Testing

#### Frontend Configuration

Update your frontend `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5050
NEXT_PUBLIC_MAIN_DOMAIN=localhost:3000
```

#### Testing Subdomains Locally

Since browsers don't naturally support subdomains on localhost, you have a few options:

**Option 1: Modify hosts file (Recommended)**
Add these lines to your `/etc/hosts` file:

```
127.0.0.1 marriott.localhost
127.0.0.1 budgetinn.localhost
127.0.0.1 localhost
```

Then access:

- Main domain: `http://localhost:3000`
- Marriott: `http://marriott.localhost:3000`
- Budget Inn: `http://budgetinn.localhost:3000`

**Option 2: Use different ports**
Run multiple frontend instances on different ports.

**Option 3: Use online services like ngrok**
For testing with real subdomains.

## Testing Scenarios

### 1. Main Domain (localhost:3000)

- ✅ Should show public Innexora landing page
- ✅ Should NOT allow access to `/auth/login` or `/auth/register`
- ✅ Should NOT allow access to `/dashboard`
- ✅ Should show testimonials and features

### 2. Hotel Subdomain (marriott.localhost:3000)

- ✅ Should redirect `/` to `/auth/login`
- ✅ Should show hotel-specific login page with logo
- ✅ Should allow registration and login
- ✅ Should access hotel-specific database
- ✅ After login, should access dashboard

### 3. Invalid Subdomain (invalid.localhost:3000)

- ✅ Should show "Hotel Not Found" page
- ✅ Should NOT access any hotel data

### 4. API Testing

#### Get Hotel Info

```bash
curl -H "Host: marriott.localhost:3000" http://localhost:5000/api/hotel/info
```

#### Check Subdomain Exists

```bash
curl http://localhost:5000/api/hotel/check-subdomain/marriott
```

#### Health Check

```bash
curl -H "Host: marriott.localhost:3000" http://localhost:5000/health
```

## Database Isolation Testing

### 1. Create Users in Different Hotels

Register users in both Marriott and Budget Inn subdomains.

### 2. Verify Data Isolation

Users created in Marriott should not appear in Budget Inn database and vice versa.

### 3. Check Database Connections

Monitor the database connections in the health endpoint to ensure proper tenant isolation.

## Production Deployment Notes

### DNS Configuration

Set up wildcard DNS for your domain:

```
*.innexora.app -> Your server IP
innexora.app -> Your server IP
```

### SSL Certificates

Use wildcard SSL certificates for `*.innexora.app`

### Environment Variables

Update production environment variables:

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/innexora-main
NODE_ENV=production
FRONTEND_URL=https://innexora.app
```

## Security Considerations

1. **Database Isolation**: Each hotel has complete database isolation
2. **Authentication**: Hotel-specific authentication using tenant database
3. **Authorization**: Users can only access their hotel's data
4. **Connection Pooling**: Optimized connection management per tenant
5. **Error Handling**: No data leakage between tenants

## Troubleshooting

### Common Issues

1. **"Hotel Not Found" Error**
   - Check if hotel exists in main database
   - Verify subdomain spelling
   - Check hotel status is "Active"

2. **Database Connection Errors**
   - Verify tenant database URL is correct
   - Check network connectivity
   - Monitor connection pool limits

3. **Authentication Issues**
   - Ensure you're on a hotel subdomain, not main domain
   - Check JWT token validity
   - Verify user exists in tenant database

### Debug Endpoints

- Health check: `GET /health`
- Database stats: Check `database` field in health response
- Tenant info: `GET /api/hotel/info` (on hotel subdomain)

## Performance Monitoring

Monitor these metrics:

- Database connection pool usage
- Response times per tenant
- Memory usage for connection management
- Cache hit rates for hotel metadata
