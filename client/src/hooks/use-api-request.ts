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
  const [showCustomUrl, setShowCustomUrl] = useState(false); // Changed to false so URL updates automatically

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
      
      if (!profileData) {
        throw new Error('No profile data returned from API');
      }

      // The BrandsForLessService now returns the complete profile directly
      // No need for complex extraction - just ensure it has the required fields
      const profile: CustomerProfile = {
        customerId: profileData.customerId || customerId,
        fullName: profileData.fullName || "Unknown Customer",
        addresses: profileData.addresses || [],
        birthDate: profileData.birthDate,
        phoneNumber: profileData.phoneNumber || "",
        email: profileData.email || "",
        latestOrders: profileData.latestOrders || [],
        gender: profileData.gender,
        registerDate: profileData.registerDate,
        totalPurchasesAmount: profileData.totalPurchasesAmount || 0,
        totalOrdersCount: profileData.totalOrdersCount || 0,
        fetchedAt: profileData.fetchedAt || getCurrentTimestamp(),
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
    setShowCustomUrl(false); // Changed to false to match the initial state
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

// Helper function for timestamp generation
function getCurrentTimestamp(): string {
  return new Date().toISOString();
}