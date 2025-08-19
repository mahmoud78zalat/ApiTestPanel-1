# Vercel Deployment Guide

This project is now configured for Vercel deployment. Follow these steps to deploy your application:

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Git Repository**: Your code should be in a GitHub, GitLab, or Bitbucket repository

## Deployment Steps

### 1. Connect Repository
- Go to your Vercel dashboard
- Click "New Project"
- Import your repository

### 2. Configure Environment Variables
Add these environment variables in your Vercel project settings:

**Required Variables:**
```
NODE_ENV=production
DATABASE_URL=your_postgresql_connection_string
```

**Optional Variables (if using authentication):**
```
SESSION_SECRET=your_session_secret_key
```

### 3. Deploy
- Vercel will automatically detect the configuration from `vercel.json`
- The build process will:
  - Install dependencies
  - Build the React frontend to `dist/public`
  - Build the Express server to `dist/index.js`
  - Deploy as a serverless function

## Project Structure for Vercel

```
your-app/
├── api/index.js          # Vercel serverless entry point
├── vercel.json          # Vercel configuration
├── server/              # Express backend
├── client/              # React frontend
├── shared/              # Shared types/schemas
└── dist/                # Build output (created during build)
    ├── public/          # Frontend build files
    └── index.js         # Server build file
```

## Build Process

The build command runs:
1. `vite build` - Builds React app to `dist/public`
2. `esbuild server/index.ts` - Builds Express server to `dist/index.js`

## Database Setup

For production database:
1. Use a PostgreSQL service (recommended: Neon, Supabase, or PlanetScale)
2. Add the `DATABASE_URL` environment variable in Vercel
3. Run database migrations if needed

## Custom Domain (Optional)

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed

## Troubleshooting

**Build Fails:**
- Check environment variables are set correctly
- Ensure all dependencies are in `package.json`
- Review build logs in Vercel dashboard

**Database Connection Issues:**
- Verify `DATABASE_URL` is correct
- Ensure database allows connections from Vercel's IPs
- Check if database requires SSL connections

**API Routes Not Working:**
- Verify routes are properly configured in `server/routes.ts`
- Check that API endpoints start with `/api/`

## Performance Monitoring

The fixed performance monitoring will now correctly track:
- Total items (maintains original count on resume)
- Processed items (correctly accumulates across pause/resume)
- Progress percentage (accurate throughout process)

## Support

For deployment issues:
1. Check Vercel documentation
2. Review build and function logs in Vercel dashboard
3. Ensure your code works locally with `NODE_ENV=production`