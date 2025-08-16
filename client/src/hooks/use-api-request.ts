/**
 * API Request Hook
 * 
 * This hook manages the core API request state and functionality
 */

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ApiService, BrandsForLessService } from "@/services/api-service";
import { constructUrl } from "@/utils/url-utils";
import { DEFAULT_CONFIG, API_ENDPOINTS } from "@/config/api-endpoints";
import type { ApiRequest, ApiResponse } from "@/types/api";
import type { CustomerProfile } from "@shared/schema";
import { getCurrentTimestamp } from "@/utils/date-utils";

export const useApiRequest = () => {
  const { toast } = useToast();
  
  // Core request state
  const [url, setUrl] = useState<string>(DEFAULT_CONFIG.DEFAULT_URL);
  const [method, setMethod] = useState<string>("GET");
  const [token, setToken] = useState<string>(DEFAULT_CONFIG.DEFAULT_TOKEN);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Endpoint management
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [showCustomUrl, setShowCustomUrl] = useState(true);

  /**
   * Main API request mutation
   */
  const requestMutation = useMutation({
    mutationFn: async (requestOverrides?: Partial<ApiRequest>) => {
      const request: ApiRequest = {
        url,
        method: method as any,
        token,
        headers: {},
        ...requestOverrides
      };

      if (!ApiService.validateRequest(request)) {
        throw new Error("Invalid request configuration");
      }

      return ApiService.makeRequest(request);
    },
    onSuccess: (data) => {
      setResponse(data);
      setError(null);
      
      toast({
        title: "Request Successful",
        description: `Status: ${data.status} • Response time: ${data.responseTime}ms`,
      });
    },
    onError: (error: Error) => {
      setError(error.message);
      setResponse(null);
      
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  /**
   * Full profile fetching mutation for complex multi-endpoint requests
   */
  const profileFetchMutation = useMutation({
    mutationFn: async (customerId: string): Promise<CustomerProfile> => {
      const finalResponse = await BrandsForLessService.fetchCustomerProfile(customerId, token);
      
      if (!finalResponse || !finalResponse.data) {
        throw new Error('No profile data returned from API');
      }

      // The final response should contain the enriched customer data
      // Extract profile data from the final enriched response
      const responseData = finalResponse.data;
      
      const profile: CustomerProfile = {
        customerId,
        fullName: extractFullNameFromFinal(responseData),
        addresses: extractAddressesFromFinal(responseData),
        birthDate: extractBirthDateFromFinal(responseData),
        phoneNumber: extractPhoneNumberFromFinal(responseData),
        email: extractEmailFromFinal(responseData),
        latestOrders: extractOrdersFromFinal(responseData),
        gender: extractGenderFromFinal(responseData),
        registerDate: extractRegisterDateFromFinal(responseData),
        totalPurchasesAmount: calculateTotalPurchasesFromFinal(responseData),
        totalOrdersCount: countTotalOrdersFromFinal(responseData),
        fetchedAt: getCurrentTimestamp(),
        rawData: responseData // Keep raw data for debugging
      };

      return profile;
    },
    onError: (error: Error) => {
      toast({
        title: "Profile Fetch Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  /**
   * Updates URL when endpoint or parameters change
   */
  const updateUrlFromEndpoint = useCallback(() => {
    const endpoint = API_ENDPOINTS.find(ep => ep.id === selectedEndpoint);
    if (endpoint && !showCustomUrl) {
      const constructedUrl = constructUrl(endpoint.url, parameters);
      setUrl(constructedUrl);
      setMethod(endpoint.method);
    }
  }, [selectedEndpoint, parameters, showCustomUrl]);

  /**
   * Resets form to default state
   */
  const resetForm = useCallback(() => {
    setUrl(DEFAULT_CONFIG.DEFAULT_URL);
    setMethod("GET");
    setToken(DEFAULT_CONFIG.DEFAULT_TOKEN);
    setResponse(null);
    setError(null);
    setSelectedEndpoint("");
    setParameters({});
    setShowCustomUrl(true);
  }, []);

  /**
   * Makes a single API request
   */
  const makeRequest = useCallback((overrides?: Partial<ApiRequest>) => {
    requestMutation.mutate(overrides);
  }, [requestMutation]);

  /**
   * Fetches a complete customer profile
   */
  const fetchFullProfile = useCallback((customerId: string) => {
    return profileFetchMutation.mutateAsync(customerId);
  }, [profileFetchMutation]);

  return {
    // State
    url,
    method,
    token,
    response,
    error,
    selectedEndpoint,
    parameters,
    showCustomUrl,
    
    // State setters
    setUrl,
    setMethod,
    setToken,
    setSelectedEndpoint,
    setParameters,
    setShowCustomUrl,
    
    // Actions
    makeRequest,
    fetchFullProfile,
    resetForm,
    updateUrlFromEndpoint,
    
    // Loading states
    isLoading: requestMutation.isPending,
    isProfileLoading: profileFetchMutation.isPending,
    
    // Mutations for advanced usage
    requestMutation,
    profileFetchMutation
  };
};

// Helper functions to extract data from final enriched API response
function extractFullNameFromFinal(responseData: any): string {
  // Try multiple possible paths based on the final response structure
  if (responseData?.data?.data?.length) {
    const user = responseData.data.data[0];
    return `${user.fname || ''} ${user.lname || ''}`.trim() || "Unknown";
  }
  if (responseData?.data?.length) {
    const user = responseData.data[0];
    return `${user.fname || ''} ${user.lname || ''}`.trim() || "Unknown";
  }
  return responseData?.fullName || responseData?.name || "Unknown";
}

function extractAddressesFromFinal(responseData: any): any[] {
  // Look for addresses in various possible locations
  const addresses = responseData?.addresses || responseData?.data?.addresses || responseData?.address || [];
  if (Array.isArray(addresses)) {
    return addresses.map((addr: any) => ({
      address: addr.address || addr.fullAddress,
      city: addr.city,
      country: addr.country
    }));
  }
  return [];
}

function extractBirthDateFromFinal(responseData: any): string | undefined {
  return responseData?.birthday || responseData?.birthDate || 
         responseData?.data?.birthday || responseData?.data?.birthDate;
}

function extractPhoneNumberFromFinal(responseData: any): string | undefined {
  return responseData?.mobile || responseData?.phone || responseData?.phoneNumber ||
         responseData?.data?.mobile || responseData?.data?.phone;
}

function extractEmailFromFinal(responseData: any): string | undefined {
  return responseData?.email || responseData?.data?.email;
}

function extractOrdersFromFinal(responseData: any): any[] {
  const orders = responseData?.orders || responseData?.latestOrders || 
                responseData?.data?.orders || responseData?.orderHistory || [];
  if (Array.isArray(orders)) {
    return orders.slice(0, 10); // Keep last 10 orders
  }
  return [];
}

function extractGenderFromFinal(responseData: any): string | undefined {
  return responseData?.gender || responseData?.data?.gender;
}

function extractRegisterDateFromFinal(responseData: any): string | undefined {
  return responseData?.regDate || responseData?.registerDate || 
         responseData?.registrationDate || responseData?.data?.regDate;
}

function calculateTotalPurchasesFromFinal(responseData: any): number {
  const orders = responseData?.orders || responseData?.latestOrders || 
                responseData?.data?.orders || responseData?.orderHistory || [];
  if (Array.isArray(orders)) {
    return orders.reduce((sum: number, order: any) => {
      return sum + (parseFloat(order.totalAmount) || 0);
    }, 0);
  }
  return responseData?.totalPurchaseAmount || responseData?.totalAmount || 0;
}

function countTotalOrdersFromFinal(responseData: any): number {
  const orders = responseData?.orders || responseData?.latestOrders || 
                responseData?.data?.orders || responseData?.orderHistory || [];
  if (Array.isArray(orders)) {
    return orders.length;
  }
  return responseData?.totalOrders || responseData?.orderCount || 0;
}