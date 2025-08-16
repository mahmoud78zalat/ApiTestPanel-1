# Overview

This is a full-stack REST API testing application built with React and Express.js. The application serves as a proxy tool that allows users to test external APIs (specifically targeting the Brands for Less API) by providing a unified interface for making HTTP requests with custom headers, authentication tokens, and request bodies. The application features a modern UI with JSON response visualization, request history tracking, and comprehensive API testing capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/UI component library built on top of Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state management and API caching
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful API with a single proxy endpoint (`/api/proxy`)
- **Request Handling**: Middleware-based architecture with custom logging and error handling
- **Development Server**: Integration with Vite for hot module replacement in development
- **Build Process**: ESBuild for server-side bundling in production

## Data Storage Solutions
- **Database**: PostgreSQL configured with Drizzle ORM
- **Connection**: Neon Database serverless PostgreSQL via `@neondatabase/serverless`
- **Schema Management**: Drizzle Kit for database migrations and schema management
- **In-Memory Storage**: Fallback MemStorage implementation for development/testing
- **Session Management**: PostgreSQL-backed sessions using `connect-pg-simple`

## Authentication and Authorization
- **Token-Based Authentication**: Support for JWT tokens passed via `x-access-token` header
- **CORS Handling**: Built-in CORS management for cross-origin API requests
- **User Management**: Basic user schema with username/password authentication
- **Session Storage**: PostgreSQL session store for persistent user sessions

## External Dependencies
- **Target API**: Brands for Less UAE API (`api.brandsforlessuae.com`)
- **Database Service**: Neon Database (serverless PostgreSQL)
- **UI Framework**: Radix UI primitives for accessible component foundations
- **Build Tools**: Vite for frontend bundling, ESBuild for backend compilation
- **Development Tools**: Replit-specific plugins for development environment integration

The application uses a monorepo structure with shared TypeScript schemas between client and server, ensuring type safety across the full stack. The proxy architecture allows for secure API testing while handling authentication, CORS, and request/response transformation transparently.

# Recent Changes

## August 16, 2025
- **Enhanced Full Profile Fetching with Complete PII Data**: Integrated new customer PII endpoint to ensure comprehensive customer profile data collection
  - Added new Step 4 in profile fetching process that calls `https://api.brandsforlessuae.com/customer/api/v1/user?mobile=&email=&customerId={customerId}`
  - This endpoint provides authoritative customer data including birthday, register date, and gender from the customer database
  - Profile fetching now prioritizes PII endpoint data as the most reliable source for customer information
  - Enhanced both single profile fetch and bulk processing modes to include the new PII data step
  - Improved data extraction logic to handle the specific response format (fname/lname, birthday, regDate, gender)
  - Added comprehensive debug logging for the new PII endpoint to track data retrieval success
  - Fallback search endpoint remains as backup option if PII fetch fails or has missing data
- **Fixed Console Flooding**: Removed excessive console logging that was causing performance issues and console flooding during API requests
- **Enhanced Export Currency Display**: Updated both CSV and TXT export functions to include proper currency symbols with all monetary amounts
  - Total purchase amounts now show with currency (e.g., `AED1,450.25` instead of `1450.25`)
  - Individual order amounts display with appropriate currency symbols
  - Currency detection uses existing `getActualCurrency()` function for accuracy
- **Improved Export Sorting**: Modified export functionality to sort countries by customer count (most to least) instead of UAE-first alphabetical
  - Countries with the highest customer count appear first in exports
  - Secondary alphabetical sorting for countries with equal customer counts
  - Applies to both CSV and TXT export formats

## August 14, 2025
- Extended HTTP method support to include HEAD, OPTIONS, TRACE, and CONNECT methods
- Added three new API endpoint presets:
  - Fetch User SMS Messages: Retrieves SMS messages for a specific phone number
  - Fetch User Email Messages: Retrieves email messages for a specific email address  
  - Cancel User Order: Cancels orders using the DELETE method
- Updated both frontend and backend validation to handle the expanded HTTP method set
- Enhanced backend request handling to properly exclude request bodies for methods that don't support them (GET, HEAD, OPTIONS)
- **Added Bulk Processing Mode**: New feature that allows processing multiple values at once
  - Toggle between single request and bulk mode
  - Input multiple values (IDs, phone numbers, emails) separated by newlines
  - Each value automatically replaces the primary parameter in the selected endpoint
  - Visual results dashboard showing success/failure status for each request
  - Real-time processing with individual response data and error details
  - Summary statistics showing total successful vs failed requests
  - Color-coded results with green (success), red (error), and yellow (pending) indicators