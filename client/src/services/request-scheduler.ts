/**
 * Request Scheduler Service
 * 
 * This service handles request batching, caching, and rate limiting
 * for improved API performance while maintaining data integrity
 */

import type { ApiRequest, ApiResponse } from "@/types/api";

export interface BatchConfig {
  /** Number of concurrent requests per batch */
  batchSize: number;
  /** Delay between batches in milliseconds */
  delayBetweenBatches: number;
  /** Maximum total time to wait for all requests */
  timeoutMs: number;
}

export interface CacheEntry {
  response: ApiResponse;
  timestamp: number;
  /** Cache duration in milliseconds */
  ttl: number;
}

/**
 * Advanced request scheduler with batching, caching, and rate limiting
 */
export class RequestScheduler {
  private cache = new Map<string, CacheEntry>();
  private defaultConfig: BatchConfig = {
    batchSize: 8,
    delayBetweenBatches: 50,
    timeoutMs: 30000
  };

  /**
   * Process multiple requests in optimized batches with caching
   */
  async processBatch<T>(
    requests: Array<() => Promise<T>>,
    config: Partial<BatchConfig> = {}
  ): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }>> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const results: Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }> = [];
    
    // Process requests in batches
    for (let i = 0; i < requests.length; i += finalConfig.batchSize) {
      const batch = requests.slice(i, i + finalConfig.batchSize);
      
      // Execute batch concurrently using Promise.allSettled
      const batchResults = await Promise.allSettled(
        batch.map(request => 
          Promise.race([
            request(),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Request timeout')), finalConfig.timeoutMs)
            )
          ])
        )
      );

      // Convert Promise.allSettled results to our format
      results.push(...batchResults.map(result => ({
        status: result.status,
        value: result.status === 'fulfilled' ? result.value : undefined,
        reason: result.status === 'rejected' ? result.reason : undefined
      })));

      // Add delay between batches (except for the last batch)
      if (i + finalConfig.batchSize < requests.length) {
        await this.delay(finalConfig.delayBetweenBatches);
      }
    }

    return results;
  }

  /**
   * Make cached API request with automatic caching
   */
  async makeCachedRequest(
    request: ApiRequest,
    apiCall: (req: ApiRequest) => Promise<ApiResponse>,
    cacheTtl: number = 300000 // 5 minutes default
  ): Promise<ApiResponse> {
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    // Make request if not cached
    const response = await apiCall(request);
    
    // Cache successful responses
    if (response.status >= 200 && response.status < 300) {
      this.setCachedResponse(cacheKey, response, cacheTtl);
    }

    return response;
  }

  /**
   * Process customer profiles with parallel API calls
   */
  async processCustomerProfilesBatch(
    customerIds: string[],
    profileFetcher: (customerId: string) => Promise<any>,
    config: Partial<BatchConfig> = {}
  ): Promise<Array<{ customerId: string; profile?: any; error?: string }>> {
    const requests = customerIds.map(customerId => async () => {
      try {
        const profile = await profileFetcher(customerId);
        return { customerId, profile };
      } catch (error) {
        return { 
          customerId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    });

    const results = await this.processBatch(requests, config);
    
    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value! 
        : { customerId: 'unknown', error: result.reason?.message || 'Request failed' }
    );
  }

  /**
   * Sequential profile data fetching that mirrors the original implementation
   * Calls multiple endpoints in sequence to build comprehensive profile data
   */
  async fetchProfileDataSequential(
    customerId: string,
    token: string,
    apiCall: (req: ApiRequest) => Promise<ApiResponse>
  ): Promise<ApiResponse> {
    const baseHeaders = {
      "accept": "application/json, text/plain, */*",
      "origin": "https://new-panel.brandsforlessuae.com",
      "referer": "https://new-panel.brandsforlessuae.com/",
      "user-agent": "Mozilla/5.0 (compatible; API-Tester/1.0)",
    };

    const requests = [
      // 1. Basic customer info
      {
        url: `https://api.brandsforlessuae.com/customer/api/v1/list?limit=1&offset=0&customerId=${customerId}`,
        method: 'POST' as const,
        token,
        headers: baseHeaders
      },
      // 2. Customer addresses  
      {
        url: `https://api.brandsforlessuae.com/customer/api/v1/address?customerId=${customerId}`,
        method: 'POST' as const,
        token,
        headers: baseHeaders
      },
      // 3. Customer orders
      {
        url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order?customerId=${customerId}&pageNum=1&pageSize=1000`,
        method: 'GET' as const,
        token,
        headers: baseHeaders
      },
      // 4. PII data (final enriched response)
      {
        url: `https://api.brandsforlessuae.com/customer/api/v1/user?mobile=&email=&customerId=${customerId}`,
        method: 'GET' as const,
        token,
        headers: baseHeaders
      }
    ];

    let lastResponse: ApiResponse | null = null;

    // Execute requests sequentially
    for (let i = 0; i < requests.length; i++) {
      try {
        lastResponse = await this.makeCachedRequest(
          requests[i], 
          apiCall, 
          i === 3 ? 60000 : 300000 // Shorter cache for final enriched response
        );
        
        // Small delay between requests
        if (i < requests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error(`Sequential request ${i + 1} failed for customer ${customerId}:`, error);
        // Continue to next request
      }
    }

    // Return the final response which contains the richest data
    return lastResponse || {
      status: 500,
      statusText: 'All requests failed',
      data: { error: 'Failed to fetch customer profile' },
      headers: {},
      responseTime: 0,
      size: 0
    };
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: ApiRequest): string {
    const keyData = {
      url: request.url,
      method: request.method,
      token: request.token?.substring(0, 20) // Only use part of token for security
    };
    return btoa(JSON.stringify(keyData));
  }

  /**
   * Get cached response if valid
   */
  private getCachedResponse(cacheKey: string): ApiResponse | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  /**
   * Cache response
   */
  private setCachedResponse(cacheKey: string, response: ApiResponse, ttl: number): void {
    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear all cached responses
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const requestScheduler = new RequestScheduler();