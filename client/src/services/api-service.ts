/**
 * API Service Layer
 * 
 * This module handles all API interactions with the backend proxy service
 * and provides standardized methods for making HTTP requests
 */

import { apiRequest } from "@/lib/queryClient";
import type { ApiRequest, ApiResponse } from "@shared/schema";

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
    const results: Array<{ success: boolean; data?: ApiResponse; error?: string }> = [];

    for (let i = 0; i < requests.length; i++) {
      try {
        const data = await this.makeRequest(requests[i]);
        results.push({ success: true, data });
      } catch (error) {
        results.push({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      // Report progress
      if (onProgress) {
        onProgress(i + 1, requests.length);
      }

      // Small delay to prevent overwhelming the server
      if (i < requests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
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
   * Fetches customer profile data from multiple endpoints
   * 
   * @param customerId - Customer ID to fetch profile for
   * @param token - Authentication token
   * @returns Promise resolving to comprehensive profile data
   */
  static async fetchCustomerProfile(customerId: string, token: string): Promise<any> {
    const requests = [
      // Customer basic info
      {
        url: `https://api.brandsforlessuae.com/customer/api/v1/user?mobile=&email=&customerId=${customerId}`,
        method: "GET" as const,
        token,
        headers: this.BASE_HEADERS,
      },
      // Customer orders
      {
        url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order?customerId=${customerId}&pageNum=1&pageSize=1000`,
        method: "GET" as const,
        token,
        headers: this.BASE_HEADERS,
      },
      // Customer address
      {
        url: `https://api.brandsforlessuae.com/customer/api/v1/address?customerId=${customerId}`,
        method: "GET" as const,
        token,
        headers: this.BASE_HEADERS,
      },
      // PII data
      {
        url: `https://api.brandsforlessuae.com/customer/api/v1/user?mobile=&email=&customerId=${customerId}`,
        method: "GET" as const,
        token,
        headers: this.BASE_HEADERS,
      }
    ];

    const results = await this.makeBulkRequests(requests);
    
    // Process and combine results
    return {
      basicInfo: results[0]?.success ? results[0].data : null,
      orders: results[1]?.success ? results[1].data : null,
      addresses: results[2]?.success ? results[2].data : null,
      piiData: results[3]?.success ? results[3].data : null,
    };
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