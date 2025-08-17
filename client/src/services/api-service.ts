/**
 * API Service Layer
 * 
 * This module handles all API interactions with the backend proxy service
 * and provides standardized methods for making HTTP requests
 */

import { apiRequest } from "@/lib/queryClient";
import type { ApiRequest, ApiResponse } from "@shared/schema";
import { professionalScheduler } from "./request-scheduler";

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
    const startTime = performance.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log("🌐 CLIENT API REQUEST", requestId);
    console.log("├─ Target URL:", request.url);
    console.log("├─ Method:", request.method);
    console.log("├─ Token provided:", !!request.token);
    if (request.token) {
      console.log("├─ Token preview:", request.token.substring(0, 20) + "...");
    }
    console.log("├─ Custom Headers:", request.headers || "none");
    if (request.body) {
      console.log("├─ Request Body:", request.body);
    }
    console.log("└─ Sending to proxy at /api/proxy");
    
    try {
      const response = await apiRequest("POST", "/api/proxy", request);
      const responseData = await response.json();
      const endTime = performance.now();
      const clientTime = Math.round(endTime - startTime);
      
      console.log("✅ CLIENT API RESPONSE", requestId);
      console.log("├─ Status:", responseData.status, responseData.statusText);
      console.log("├─ Server Response Time:", responseData.responseTime + "ms");
      console.log("├─ Total Client Time:", clientTime + "ms");
      console.log("├─ Response Size:", responseData.size + " bytes");
      console.log("├─ Data Preview:", JSON.stringify(responseData.data).substring(0, 200) + "...");
      console.log("└─ Headers Count:", Object.keys(responseData.headers || {}).length);
      
      return responseData;
    } catch (error) {
      const endTime = performance.now();
      const clientTime = Math.round(endTime - startTime);
      
      console.error("❌ CLIENT API ERROR", requestId);
      console.error("├─ Client Time:", clientTime + "ms");
      console.error("├─ Error Type:", error instanceof Error ? error.constructor.name : typeof error);
      console.error("├─ Error Message:", error instanceof Error ? error.message : String(error));
      console.error("└─ Original Request:", request);
      
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
    const bulkId = Math.random().toString(36).substr(2, 9);
    const startTime = performance.now();
    
    console.log("📦 BULK REQUEST STARTED", bulkId);
    console.log("├─ Total Requests:", requests.length);
    console.log("├─ Batch Size: 8");
    console.log("├─ Delay Between Batches: 50ms");
    console.log("└─ Timeout: 30s per request");
    
    // Convert requests to functions for batch processing
    const requestFunctions = requests.map((request, index) => async () => {
      console.log(`📋 Processing bulk request ${index + 1}/${requests.length}:`, request.url);
      return await professionalScheduler.scheduleRequest(request.url, request.method, 'normal', { token: request.token, headers: request.headers });
    });

    // Process in batches with progress tracking
    const results = await Promise.allSettled(
      requestFunctions.map(async (requestFn) => {
        try {
          return await requestFn();
        } catch (error) {
          throw error;
        }
      })
    );

    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);
    
    console.log("📊 BULK REQUEST COMPLETED", bulkId);
    console.log("├─ Total Time:", totalTime + "ms");
    console.log("├─ Average per Request:", Math.round(totalTime / requests.length) + "ms");
    
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const errorCount = results.length - successCount;
    
    console.log("├─ Successful:", successCount);
    console.log("├─ Failed:", errorCount);
    console.log("└─ Success Rate:", Math.round((successCount / results.length) * 100) + "%");

    // Convert results and report progress
    return results.map((result, index) => {
      if (onProgress) {
        onProgress(index + 1, requests.length);
      }

      return {
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : undefined,
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
   * Determines if an ID looks like an order ID vs customer ID
   * Order IDs are typically alphanumeric (e.g., A062493300038, B123456789)
   * Customer IDs are typically numeric (e.g., 1405941, 123456)
   */
  private static isOrderId(id: string): boolean {
    // Check if ID contains letters (order IDs often start with letters)
    // or is very long (order IDs tend to be longer)
    return /^[A-Z]\d+/.test(id) || (id.length > 10 && /[A-Za-z]/.test(id));
  }

  /**
   * Fetches comprehensive customer profile by calling multiple endpoints sequentially
   * This maintains the original behavior of building rich profile data
   * 
   * @param customerIdOrOrderId - Customer ID or Order ID to fetch profile for
   * @param token - Authentication token
   * @returns Promise resolving to comprehensive profile data from the final enriched response
   */
  static async fetchCustomerProfile(customerIdOrOrderId: string, token: string): Promise<any> {
    const profileId = Math.random().toString(36).substr(2, 9);
    const startTime = performance.now();
    
    console.log("👤 CUSTOMER PROFILE FETCH STARTED", profileId);
    console.log("├─ Input ID:", customerIdOrOrderId);
    console.log("├─ Token provided:", !!token);
    console.log("└─ Multi-step process: resolve ID → address → orders → user → pii");
    
    // Step 0: Determine if input is customer ID or order ID and resolve to customer ID
    let actualCustomerId = customerIdOrOrderId;
    const isOrderId = this.isOrderId(customerIdOrOrderId);
    
    if (isOrderId) {
      console.log("🔍 Step 0: Resolving order ID to customer ID", profileId);
      try {
        const orderRequest: ApiRequest = {
          url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order/${customerIdOrOrderId}`,
          method: "GET",
          token: token.trim(),
        };
        
        const orderData = await this.makeRequest(orderRequest);
        
        if (orderData.status === 200 && orderData.data && orderData.data.data) {
          const order = orderData.data.data;
          actualCustomerId = order.customerId || order.customer_id || order.userId || order.user_id;
          
          if (!actualCustomerId) {
            throw new Error(`Could not extract customer ID from order ${customerIdOrOrderId}`);
          }
          
          console.log("✅ Resolved customer ID:", actualCustomerId);
        } else {
          throw new Error(`Order ${customerIdOrOrderId} not found or invalid response`);
        }
      } catch (error) {
        console.error("❌ Step 0 failed - order resolution:", error);
        throw new Error(`Failed to resolve order ID ${customerIdOrOrderId} to customer ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Initialize profile object - this matches the original structure exactly
    const profile: any = {
      customerId: actualCustomerId,
      originalInput: customerIdOrOrderId,
      fullName: "",
      addresses: [],
      phoneNumber: "",
      email: "",
      latestOrders: [],
      totalPurchasesAmount: 0,
      totalOrdersCount: 0,
      fetchedAt: new Date().toISOString(),
    };

    // Step 1: Fetch customer address/profile info (ORIGINAL IMPLEMENTATION)
    try {
      console.log("🏠 Step 1: Fetching address data", profileId);
      const addressRequest: ApiRequest = {
        url: `https://api.brandsforlessuae.com/customer/api/v1/address?customerId=${actualCustomerId}`,
        method: "GET",
        token: token.trim(),
      };
      
      const addressData = await this.makeRequest(addressRequest);
      
      if (addressData.status === 200 && addressData.data) {
        // Handle both array and object response formats
        const customerDataArray = Array.isArray(addressData.data) ? addressData.data : addressData.data.data || [addressData.data];
        const customerData = customerDataArray.length > 0 ? customerDataArray[0] : {};
        
        // Extract basic profile info from the actual API structure
        // Check if user is a guest and skip
        if (customerData.guest === 1 || customerData.isGuest === true || customerData.guest === "1") {
          throw new Error(`Customer ${actualCustomerId} is a guest user - skipping profile collection`);
        }
        
        // Extract name properly from firstname + lastname fields (address data uses lowercase)
        const fullName = customerData.fullName || customerData.name || `${customerData.firstname || customerData.firstName || ''} ${customerData.lastname || customerData.lastName || ''}`.trim();
        // Only set name from address data if we actually found a valid name
        if (fullName && fullName !== "") {
          profile.fullName = fullName;
        }
        
        // Store address data properly
        profile.addresses = customerDataArray || [];
        
        // Extract phone number from various possible fields
        profile.phoneNumber = customerData.phone || customerData.phoneNumber || customerData.mobile || customerData.mobileNumber || "";
        
        // Extract email from various possible fields
        profile.email = customerData.email || customerData.emailAddress || "";
        
        // Extract additional demographic data if available in address response
        profile.birthDate = customerData.birthDate || customerData.dateOfBirth || customerData.dob || undefined;
        profile.gender = customerData.gender || undefined;
        profile.registerDate = customerData.registerDate || customerData.createdAt || customerData.registrationDate || undefined;
        
        console.log("✅ Step 1 - Address data extracted:", {
          fullName: profile.fullName,
          phone: profile.phoneNumber,
          email: profile.email,
          addressCount: profile.addresses.length
        });
      }
    } catch (error) {
      console.warn("❌ Step 1 failed - address data:", error);
    }

    // Step 2: Fetch customer orders (ORIGINAL IMPLEMENTATION)
    try {
      console.log("📦 Step 2: Fetching orders data", profileId);
      const ordersRequest: ApiRequest = {
        url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order?customerId=${actualCustomerId}&pageNum=1&pageSize=1000`,
        method: "GET",
        token: token.trim(),
      };
      
      const ordersData = await this.makeRequest(ordersRequest);
      
      if (ordersData.status === 200 && ordersData.data) {
        // Handle different response structures
        let orders = [];
        if (Array.isArray(ordersData.data)) {
          orders = ordersData.data;
        } else if (ordersData.data.data && Array.isArray(ordersData.data.data)) {
          orders = ordersData.data.data;
        } else if (ordersData.data.orders && Array.isArray(ordersData.data.orders)) {
          orders = ordersData.data.orders;
        }
        
        // Sort by date and take latest orders  
        const sortedOrders = orders.sort((a: any, b: any) => {
          const dateA = new Date(a.createDate || a.createdAt || a.orderDate || a.date || 0).getTime();
          const dateB = new Date(b.createDate || b.createdAt || b.orderDate || b.date || 0).getTime();
          return dateB - dateA;
        });
        
        // Calculate total purchases amount from ALL orders
        const totalAmount = orders.reduce((total: number, order: any) => {
          // Extract amount from transactionAmount string (e.g., "AED 10.00" -> 10.00)
          let orderAmount = 0;
          if (order.transactionAmount && typeof order.transactionAmount === 'string') {
            const matches = order.transactionAmount.match(/[\d.]+/);
            if (matches) {
              orderAmount = parseFloat(matches[0]);
            }
          } else {
            orderAmount = parseFloat(
              order.amount ||
              order.subtotal ||
              order.subTotal ||
              order.transactionPrice || 
              order.totalAmount || 
              order.value || 
              order.price || 
              order.orderTotal || 
              order.grandTotal || 
              0
            );
          }
          return total + orderAmount;
        }, 0);
        
        profile.totalPurchasesAmount = totalAmount;
        profile.totalOrdersCount = orders.length;
        
        // Process latest 5 orders for display with invoice URLs
        const latestOrdersForDisplay = sortedOrders.slice(0, 5);
        const BATCH_SIZE = 5;
        
        let latestOrdersWithUrls: any[] = [];
        
        // Process orders in batches
        for (let i = 0; i < latestOrdersForDisplay.length; i += BATCH_SIZE) {
          const batch = latestOrdersForDisplay.slice(i, i + BATCH_SIZE);
          
          const batchPromises = batch.map(async (order: any) => {
            // Process order data with proper date, status, and amount extraction
            const orderId = order.orderId || order.id;
            
            // Extract proper order date
            const orderDate = order.createDate || order.createdAt || order.orderDate || order.date;
            
            // Extract proper order status from the orders list response
            const orderStatus = order.shipStatus || 
                              order.status || 
                              order.orderStatus || 
                              order.deliveryStatus ||
                              'Unknown';
            
            // Extract proper transaction amount
            let transactionAmount = order.transactionAmount;
            if (!transactionAmount && order.amount) {
              transactionAmount = `AED ${order.amount}`;
            }
            
            // Create base order object with proper data
            const baseOrder = {
              ...order,
              orderId: orderId,
              createDate: orderDate,
              orderDate: orderDate,
              transactionAmount: transactionAmount,
              orderStatus: orderStatus,
              shipStatus: orderStatus,
              invoiceUrl: null
            };
            
            // Always fetch detailed order information to get complete data
            if (orderId) {
              try {
                const orderDetailsRequest: ApiRequest = {
                  url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order/${orderId}`,
                  method: "GET",
                  token: token.trim(),
                };
                
                const orderDetailsResponse = await this.makeRequest(orderDetailsRequest);
                
                if (orderDetailsResponse.status === 200 && orderDetailsResponse.data && orderDetailsResponse.data.data) {
                  const detailedOrderData = orderDetailsResponse.data.data;
                  
                  // Extract comprehensive order information from detailed API response
                  const enhancedOrderStatus = detailedOrderData.shipStatus || 
                                            detailedOrderData.orderStatus || 
                                            detailedOrderData.status || 
                                            orderStatus;
                  
                  // Extract proper transaction amount from detailed data
                  let enhancedTransactionAmount = transactionAmount;
                  if (detailedOrderData.subtotal) {
                    enhancedTransactionAmount = `AED ${detailedOrderData.subtotal}`;
                  } else if (detailedOrderData.transactionAmount) {
                    enhancedTransactionAmount = `AED ${detailedOrderData.transactionAmount}`;
                  }
                  
                  // Extract invoice URL from detailed response
                  const invoiceUrl = detailedOrderData.invoiceUrl || 
                                   (detailedOrderData.invoiceNo ? 
                                     `https://portal.brandsforlessuae.com/invoice/invoice.jsp?invno=${detailedOrderData.invoiceNo}` : 
                                     null);
                  
                  // Extract payment method information
                  const paymentMethod = detailedOrderData.paymentExtraInfo || 
                                      detailedOrderData.paymentType || 
                                      detailedOrderData.paymentMethod || 
                                      detailedOrderData.paymentGateWay || 
                                      'Unknown';
                  
                  // Extract proper order date from detailed data
                  const enhancedOrderDate = detailedOrderData.createdTime || 
                                          detailedOrderData.createDate || 
                                          detailedOrderData.orderDate || 
                                          orderDate;
                  
                  return {
                    ...baseOrder,
                    // Override with enhanced data from detailed API response
                    createDate: enhancedOrderDate,
                    orderDate: enhancedOrderDate,
                    transactionAmount: enhancedTransactionAmount,
                    orderStatus: enhancedOrderStatus,
                    shipStatus: enhancedOrderStatus,
                    paymentMethod: paymentMethod,
                    paymentExtraInfo: paymentMethod,
                    invoiceUrl: invoiceUrl,
                    subtotal: detailedOrderData.subtotal || detailedOrderData.transactionAmount,
                    enrichedData: detailedOrderData
                  };
                } else {
                  console.warn(`Order details API returned error for ${orderId}:`, orderDetailsResponse.status, orderDetailsResponse.data?.message);
                }
              } catch (error) {
                console.warn(`Failed to fetch detailed order data for ${orderId}:`, error);
              }
            }
            
            // Return base order data (which already has all the essential info)
            return baseOrder;
          });
          
          const batchResults = await Promise.all(batchPromises);
          latestOrdersWithUrls.push(...batchResults);
          
          // Delay between batches
          if (i + BATCH_SIZE < latestOrdersForDisplay.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        profile.latestOrders = latestOrdersWithUrls;
      }
    } catch (error) {
      console.warn("❌ Step 2 failed - orders data:", error);
    }

    // Step 3: Try to get more profile data if name is still missing
    if (!profile.fullName || profile.fullName === "") {
      try {
        console.log("👤 Step 3: Fetching user data (name missing)", profileId);
        const userRequest: ApiRequest = {
          url: `https://api.brandsforlessuae.com/customer/api/v1/user?customerId=${actualCustomerId}`,
          method: "GET",
          token: token.trim(),
        };
        
        const userData = await this.makeRequest(userRequest);
        
        if (userData.status === 200 && userData.data && userData.data.data && userData.data.data.length > 0) {
          const user = userData.data.data[0];
          const fullName = `${user.fname || ''} ${user.lname || ''}`.trim();
          if (fullName && fullName !== "") {
            profile.fullName = fullName;
          }
          
          if (!profile.phoneNumber && user.mobile) {
            profile.phoneNumber = user.mobile;
          }
          if (!profile.email && user.email) {
            profile.email = user.email;
          }
        }
      } catch (error) {
        console.warn("❌ Step 3 failed - user data:", error);
      }
    }

    // Step 4: Fetch comprehensive customer PII data using the correct endpoint
    try {
      console.log("🔐 Step 4: Fetching PII and customer details", profileId);
      const piiRequest: ApiRequest = {
        url: `https://api.brandsforlessuae.com/customer/api/v1/user?mobile=&email=&customerId=${actualCustomerId}`,
        method: "GET",
        token: token.trim(),
      };
      
      const piiResponse = await this.makeRequest(piiRequest);
      
      if (piiResponse.status === 200 && piiResponse.data && piiResponse.data.data && piiResponse.data.data.length > 0) {
        const customerPiiData = piiResponse.data.data[0];
        
        // Extract PII data with priority to this authoritative source
        if (customerPiiData.birthday) {
          profile.birthDate = customerPiiData.birthday;
        }
        if (customerPiiData.gender) {
          profile.gender = customerPiiData.gender;
        }
        // Fix registration date mapping - ensure we capture regDate properly
        if (customerPiiData.regDate) {
          profile.registerDate = customerPiiData.regDate;
        } else if (customerPiiData.registrationDate) {
          profile.registerDate = customerPiiData.registrationDate;
        } else if (customerPiiData.createdAt) {
          profile.registerDate = customerPiiData.createdAt;
        }
        
        // Extract missing contact info from PII source
        if (!profile.email && customerPiiData.email) {
          profile.email = customerPiiData.email;
        }
        if (!profile.phoneNumber && customerPiiData.mobile) {
          profile.phoneNumber = customerPiiData.mobile;
        }
        
        // Extract name with priority to PII source
        if (!profile.fullName || profile.fullName === "Unknown Customer" || profile.fullName.trim() === "") {
          const fullName = customerPiiData.fullName || 
                           customerPiiData.name || 
                           `${customerPiiData.fname || customerPiiData.firstName || ''} ${customerPiiData.lname || customerPiiData.lastName || ''}`.trim();
          if (fullName && fullName !== "") {
            profile.fullName = fullName;
          }
        }

        console.log("✅ PII data extracted successfully:", {
          birthday: profile.birthDate,
          gender: profile.gender, 
          registerDate: profile.registerDate,
          fullName: profile.fullName,
          rawRegDate: customerPiiData.regDate,
          rawRegistrationDate: customerPiiData.registrationDate,
          rawCreatedAt: customerPiiData.createdAt
        });
      } else {
        console.warn("❌ PII endpoint returned no data or error:", piiResponse.status, piiResponse.data?.message);
      }
    } catch (error) {
      console.warn("❌ Step 4 failed - PII data fetch:", error);
    }

    // Final validation
    if (!profile.fullName || profile.fullName.trim() === "") {
      profile.fullName = "Unknown Customer";
    }

    const endTime = performance.now();
    const totalTime = Math.round(endTime - startTime);
    
    console.log("✅ CUSTOMER PROFILE COMPLETED", profileId);
    console.log("├─ Total Time:", totalTime + "ms");
    console.log("├─ Customer Name:", profile.fullName);
    console.log("├─ Phone:", profile.phoneNumber || "not found");
    console.log("├─ Email:", profile.email || "not found");
    console.log("├─ Addresses:", profile.addresses.length);
    console.log("├─ Orders:", profile.totalOrdersCount);
    console.log("├─ Total Purchases:", profile.totalPurchasesAmount);
    console.log("└─ Latest Orders:", profile.latestOrders.length);

    // Return the complete profile data directly (not wrapped in a response structure)
    return profile;
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