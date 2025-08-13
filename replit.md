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