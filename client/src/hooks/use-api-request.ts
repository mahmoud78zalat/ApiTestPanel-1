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
      const profileData = await BrandsForLessService.fetchCustomerProfile(customerId, token);
      
      // Process and combine the profile data
      const profile: CustomerProfile = {
        customerId,
        fullName: extractFullName(profileData.basicInfo),
        addresses: extractAddresses(profileData.addresses),
        birthDate: extractBirthDate(profileData.piiData),
        phoneNumber: extractPhoneNumber(profileData.basicInfo),
        email: extractEmail(profileData.basicInfo),
        latestOrders: extractOrders(profileData.orders),
        gender: extractGender(profileData.piiData),
        registerDate: extractRegisterDate(profileData.piiData),
        totalPurchasesAmount: calculateTotalPurchases(profileData.orders),
        totalOrdersCount: countTotalOrders(profileData.orders),
        fetchedAt: getCurrentTimestamp(),
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

// Helper functions to extract data from API responses
function extractFullName(basicInfoResponse: any): string {
  if (!basicInfoResponse?.data?.data?.length) return "Unknown";
  const user = basicInfoResponse.data.data[0];
  return `${user.fname || ''} ${user.lname || ''}`.trim() || "Unknown";
}

function extractAddresses(addressResponse: any): any[] {
  if (!addressResponse?.data?.data) return [];
  return addressResponse.data.data.map((addr: any) => ({
    address: addr.address,
    city: addr.city,
    country: addr.country
  }));
}

function extractBirthDate(piiResponse: any): string | undefined {
  if (!piiResponse?.data?.data?.data?.length) return undefined;
  return piiResponse.data.data.data[0]?.birthday;
}

function extractPhoneNumber(basicInfoResponse: any): string | undefined {
  if (!basicInfoResponse?.data?.data?.length) return undefined;
  return basicInfoResponse.data.data[0]?.mobile;
}

function extractEmail(basicInfoResponse: any): string | undefined {
  if (!basicInfoResponse?.data?.data?.length) return undefined;
  return basicInfoResponse.data.data[0]?.email;
}

function extractOrders(ordersResponse: any): any[] {
  if (!ordersResponse?.data?.data) return [];
  return ordersResponse.data.data.slice(0, 10); // Keep last 10 orders
}

function extractGender(piiResponse: any): string | undefined {
  if (!piiResponse?.data?.data?.data?.length) return undefined;
  return piiResponse.data.data.data[0]?.gender;
}

function extractRegisterDate(piiResponse: any): string | undefined {
  if (!piiResponse?.data?.data?.data?.length) return undefined;
  return piiResponse.data.data.data[0]?.regDate;
}

function calculateTotalPurchases(ordersResponse: any): number {
  if (!ordersResponse?.data?.data) return 0;
  return ordersResponse.data.data.reduce((sum: number, order: any) => {
    return sum + (parseFloat(order.totalAmount) || 0);
  }, 0);
}

function countTotalOrders(ordersResponse: any): number {
  if (!ordersResponse?.data?.data) return 0;
  return ordersResponse.data.data.length;
}