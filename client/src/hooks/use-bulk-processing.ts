/**
 * Bulk Processing Hook
 * 
 * This hook manages bulk processing state and operations for API requests
 */

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiService, BrandsForLessService } from "@/services/api-service";
import { requestScheduler } from "@/services/request-scheduler";
import { constructUrl } from "@/utils/url-utils";
import type { ApiRequest, BulkProcessingResult } from "@/types/api";
import type { ApiEndpoint } from "@/config/api-endpoints";

export const useBulkProcessing = () => {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkResults, setBulkResults] = useState<BulkProcessingResult[]>([]);

  /**
   * Processes multiple values in bulk mode
   */
  const bulkProcessingMutation = useMutation({
    mutationFn: async ({
      values,
      endpoint,
      token,
      customHeaders = {}
    }: {
      values: string[];
      endpoint: ApiEndpoint;
      token: string;
      customHeaders?: Record<string, string>;
    }) => {
      // Initialize results
      const initialResults: BulkProcessingResult[] = values.map(value => ({
        value,
        status: 'pending'
      }));
      setBulkResults(initialResults);

      const requests: ApiRequest[] = values.map(value => {
        const params = { [endpoint.parameters[0].key]: value };
        const url = constructUrl(endpoint.url, params);

        return {
          url,
          method: endpoint.method,
          token,
          headers: customHeaders
        };
      });

      // Process requests and update results incrementally
      const results = await ApiService.makeBulkRequests(
        requests,
        (completed, total) => {
          // Update progress - mark completed requests as success/error
          setBulkResults(prev => prev.map((result, index) => {
            if (index < completed) {
              // This result is complete
              return result.status !== 'pending' ? result : {
                ...result,
                status: 'success' as const // Will be updated with actual result below
              };
            }
            return result;
          }));
        }
      );

      // Update final results
      const finalResults: BulkProcessingResult[] = values.map((value, index) => {
        const result = results[index];
        return {
          value,
          status: result.success ? 'success' : 'error',
          response: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error
        };
      });

      setBulkResults(finalResults);
      return finalResults;
    }
  });

  /**
   * Parses bulk input into individual values
   */
  const parseBulkInput = useCallback((input: string): string[] => {
    return input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }, []);

  /**
   * Clears bulk processing results
   */
  const clearBulkResults = useCallback(() => {
    setBulkResults([]);
  }, []);

  /**
   * Gets summary statistics for bulk results
   */
  const getBulkSummary = useCallback(() => {
    const total = bulkResults.length;
    const successful = bulkResults.filter(r => r.status === 'success').length;
    const failed = bulkResults.filter(r => r.status === 'error').length;
    const pending = bulkResults.filter(r => r.status === 'pending').length;

    return {
      total,
      successful,
      failed,
      pending,
      completed: total - pending
    };
  }, [bulkResults]);

  return {
    bulkMode,
    bulkInput,
    bulkResults,
    setBulkMode,
    setBulkInput,
    setBulkResults,
    bulkProcessingMutation,
    parseBulkInput,
    clearBulkResults,
    getBulkSummary
  };
};