/**
 * API Service Layer
 * 
 * This module handles all API interactions with the backend proxy service
 * and provides standardized methods for making HTTP requests
 */

import { apiRequest } from "@/lib/queryClient";
import type { ApiRequest, ApiResponse } from "@shared/schema";
import { requestScheduler } from "./request-scheduler";

/**
 * Main API service class for handling HTTP requests through the backend proxy
 */
export class ApiService {
  /**
   * Makes a single API request through the backend proxy
   * 
   * @param request - API request configuration
   * @returns Promise resolving to API response
   * @throws Error if request fails
   */
  static async makeRequest(request: ApiRequest): Promise<ApiResponse> {
    try {
      const response = await apiRequest("POST", "/api/proxy", request);
      return await response.json();
    } catch (error) {
      throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Makes multiple API requests in sequence
   * 
   * @param requests - Array of API request configurations
   * @param onProgress - Optional callback for progress updates
   * @returns Promise resolving to array of results
   */
  static async makeBulkRequests(
    requests: ApiRequest[], 
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<{ success: boolean; data?: ApiResponse; error?: string }>> {
    // Convert requests to functions for batch processing
    const requestFunctions = requests.map(request => async () => {
      return await requestScheduler.makeCachedRequest(request, this.makeRequest.bind(this));
    });

    // Process in batches with progress tracking
    const results = await requestScheduler.processBatch(requestFunctions, {
      batchSize: 8,
      delayBetweenBatches: 50,
      timeoutMs: 30000
    });

    // Convert results and report progress
    return results.map((result, index) => {
      if (onProgress) {
        onProgress(index + 1, requests.length);
      }

      return {
        success: result.status === 'fulfilled',
        data: result.value,
        error: result.status === 'rejected' 
          ? (result.reason instanceof Error ? result.reason.message : 'Unknown error')
          : undefined
      };
    });
  }

  /**
   * Validates a request configuration before sending
   * 
   * @param request - API request to validate
   * @returns True if valid, false otherwise
   */
  static validateRequest(request: Partial<ApiRequest>): request is ApiRequest {
    return !!(
      request.url &&
      request.method &&
      typeof request.url === 'string' &&
      request.url.length > 0
    );
  }
}

/**
 * Specialized service for Brands for Less API endpoints
 */
export class BrandsForLessService extends ApiService {
  private static readonly BASE_HEADERS = {
    "accept": "application/json, text/plain, */*",
    "origin": "https://new-panel.brandsforlessuae.com",
    "referer": "https://new-panel.brandsforlessuae.com/",
    "user-agent": "Mozilla/5.0 (compatible; API-Tester/1.0)",
  };

  /**
   * Fetches comprehensive customer profile by calling multiple endpoints sequentially
   * This maintains the original behavior of building rich profile data
   * 
   * @param customerId - Customer ID to fetch profile for
   * @param token - Authentication token
   * @returns Promise resolving to comprehensive profile data from the final enriched response
   */
  static async fetchCustomerProfile(customerId: string, token: string): Promise<any> {
    const requests = [
      // 1. Basic customer info
      {
        url: `https://api.brandsforlessuae.com/customer/api/v1/list?limit=1&offset=0&customerId=${customerId}`,
        method: 'POST' as const,
        token,
        headers: this.BASE_HEADERS
      },
      // 2. Customer addresses
      {
        url: `https://api.brandsforlessuae.com/customer/api/v1/address?customerId=${customerId}`,
        method: 'POST' as const,
        token,
        headers: this.BASE_HEADERS
      },
      // 3. Customer orders (shipment endpoint for rich data)
      {
        url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order?customerId=${customerId}&pageNum=1&pageSize=1000`,
        method: 'GET' as const,
        token,
        headers: this.BASE_HEADERS
      },
      // 4. PII/User data (final enriched endpoint)
      {
        url: `https://api.brandsforlessuae.com/customer/api/v1/user?mobile=&email=&customerId=${customerId}`,
        method: 'GET' as const,
        token,
        headers: this.BASE_HEADERS
      }
    ];

    let lastResponse = null;

    // Execute requests sequentially to build up the data progressively
    for (let i = 0; i < requests.length; i++) {
      try {
        const response = await this.makeRequest(requests[i]);
        lastResponse = response;
        
        // Small delay between requests to prevent overwhelming the API
        if (i < requests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      } catch (error) {
        console.error(`Request ${i + 1} failed for customer ${customerId}:`, error);
        // Continue to next request even if one fails
      }
    }

    // Return the final response which should have the richest data
    return lastResponse;
  }

  /**
   * Batch process multiple customer profiles with optimal performance
   * 
   * @param customerIds - Array of customer IDs to process
   * @param token - Authentication token
   * @returns Promise resolving to array of profile results
   */
  static async fetchCustomerProfilesBatch(
    customerIds: string[], 
    token: string
  ): Promise<Array<{ customerId: string; profile?: any; error?: string }>> {
    const profileFetcher = async (customerId: string) => {
      return await this.fetchCustomerProfile(customerId, token);
    };

    return await requestScheduler.processCustomerProfilesBatch(customerIds, profileFetcher, {
      batchSize: 6, // Slightly smaller batches for profile fetching since each profile makes 4 API calls
      delayBetweenBatches: 100, // Slightly longer delay for complex operations
      timeoutMs: 45000 // Longer timeout for profile operations
    });
  }

  /**
   * Cancels an order using the cancel endpoint
   * 
   * @param orderId - Order ID to cancel
   * @param token - Authentication token
   * @param reason - Cancellation reason
   * @returns Promise resolving to cancellation result
   */
  static async cancelOrder(
    orderId: string, 
    token: string, 
    reason: string = "Customer requested cancellation"
  ): Promise<ApiResponse> {
    const payload = {
      createdBy: 2457,
      assignee: 105,
      reason,
      notes: `Order cancelled via API tester at ${new Date().toISOString()}`
    };

    return this.makeRequest({
      url: `https://api.brandsforlessuae.com/shipment/api/v1/cancel/order/${orderId}`,
      method: "POST",
      token,
      headers: {
        ...this.BASE_HEADERS,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }
}