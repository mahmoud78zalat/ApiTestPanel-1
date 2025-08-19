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
import { getShippingAddressFromOrders } from "@/utils/currency-utils";
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
    mutationFn: async (customerId: string): Promise<CustomerProfile | null> => {
      const profileData = await BrandsForLessService.fetchCustomerProfile(customerId, token);
      
      // Return null if no valid data found - this allows caller to handle appropriately
      if (!profileData) {
        return null;
      }

      // The BrandsForLessService now returns the complete profile directly
      // Extract addresses and orders
      const addresses = Array.isArray(profileData.addresses) ? profileData.addresses : [];
      const latestOrders = Array.isArray(profileData.latestOrders) ? profileData.latestOrders : [];
      
      // If no customer address, try to extract shipping address from orders as fallback
      let finalAddresses = [...addresses];
      if (addresses.length === 0 && latestOrders.length > 0) {
        // Extract shipping details from orders
        const firstOrderWithShipping = latestOrders.find((order: any) => 
          order.enrichedData?.shippingAddress || order.shippingAddress
        );
        
        if (firstOrderWithShipping) {
          const shippingData = firstOrderWithShipping.enrichedData || firstOrderWithShipping;
          
          // Create a fallback address using shipping information from the latest order
          const fallbackAddress = {
            address: shippingData.shippingAddress || '',
            city: shippingData.shippingState || shippingData.shippingArea || '',
            country: shippingData.shippingCountry || 'United Arab Emirates',
            type: 'shipping_fallback',
            // Additional details from order data
            fullAddress: `${shippingData.shippingAddress || ''}${shippingData.shippingState ? ', ' + shippingData.shippingState : ''}${shippingData.shippingCountry ? ', ' + shippingData.shippingCountry : ''}`.replace(/^, |, $/, ''),
            postalCode: shippingData.shippingZip || '',
            area: shippingData.shippingArea || '',
            countryCode: shippingData.shippingCountryCode || shippingData.shippingCountryCode2 || 'AE'
          };
          
          // Only add if we have meaningful address data
          if (fallbackAddress.address && fallbackAddress.address.trim() !== '') {
            finalAddresses.push(fallbackAddress);
          }
        }
      }

      const profile: CustomerProfile = {
        customerId: profileData.customerId || customerId,
        fullName: profileData.fullName,
        addresses: finalAddresses,
        birthDate: profileData.birthDate,
        phoneNumber: profileData.phoneNumber || "",
        email: profileData.email || "",
        latestOrders: latestOrders,
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
   * Fetches a complete customer profile - returns null if no valid data found
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