# Brands for Less API Testing Platform

## Project Overview
A professional API testing and customer profile management platform for Brands for Less, offering comprehensive endpoint exploration, performance optimization, and advanced data export capabilities.

## Key Technologies
- React/TypeScript frontend
- Advanced API request handling with proxy server
- Dynamic export functionality
- Comprehensive profile management
- Real-time performance monitoring
- Enhanced data processing and debugging mechanisms

## Recent Changes
- **Checkpoint System Implementation (August 19, 2025)**: Complete redesign of bulk processing with smooth pause/resume functionality
- **Button State Management**: Fixed laggy stop button issues with proper state transitions and immediate UI feedback
- **Smart Checkpoint Creation**: Processing now creates checkpoints at exact pause points for seamless resume
- **Enhanced Address Display**: Clean fallback addresses showing only "City, Country" format instead of store pickup details
- **Performance Optimization (August 17, 2025)**: Removed extensive logging that was causing massive performance issues during bulk operations
- **Bulk Request Optimization**: Reduced concurrent request limits and added throttling to prevent UI freezing during 700+ requests

## User Preferences
- Performance is critical - avoid verbose logging during bulk operations
- System should handle 700+ requests without freezing
- Prioritize stability over speed for bulk operations
- Minimal console output to prevent performance degradation

## Architecture
- Frontend handles most application logic
- Backend serves as proxy for API calls and data persistence
- Performance monitoring with throttled updates
- Bulk processing with conservative batching and rate limiting

## Performance Guidelines
- Throttle UI updates during bulk operations (max every 250-500ms)
- Limit concurrent requests to 6 maximum
- Use conservative rate limiting (3 requests/second)
- Remove or minimize console logging during high-volume operations
- Implement memory management for large data sets (arrays bounded to 1000 items)