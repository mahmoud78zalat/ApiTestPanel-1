/**
 * Professional Bulk Processing Hook with Optimized Batching
 * 
 * This hook implements high-performance bulk operations with:
 * - Concurrent batch processing (5-10 requests at once)
 * - Intelligent rate limiting and backoff
 * - Progress tracking and duplicate detection
 * - Error handling and retry mechanisms
 */

import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { BrandsForLessService } from "@/services/api-service";
import type { CustomerProfile } from "@shared/schema";

interface BulkProcessingState {
  isProcessing: boolean;
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  duplicateItems: number;
  currentBatch: number;
  totalBatches: number;
  startTime: number;
  estimatedTimeRemaining: number;
  averageProcessingTime: number;
  errors: Array<{ customerId: string; error: string; attempt: number }>;
}

interface BulkProcessingOptions {
  batchSize: number;
  maxConcurrent: number;
  retryAttempts: number;
  delayBetweenBatches: number;
  onProgress: (state: BulkProcessingState) => void;
  onProfileProcessed: (profile: CustomerProfile, isDuplicate: boolean) => void;
  onDebugLog: (level: string, message: string, data?: any) => void;
}

export const useBulkProcessing = () => {
  const { toast } = useToast();
  const [processingState, setProcessingState] = useState<BulkProcessingState>({
    isProcessing: false,
    totalItems: 0,
    processedItems: 0,
    successfulItems: 0,
    failedItems: 0,
    duplicateItems: 0,
    currentBatch: 0,
    totalBatches: 0,
    startTime: 0,
    estimatedTimeRemaining: 0,
    averageProcessingTime: 0,
    errors: []
  });

  const abortController = useRef<AbortController | null>(null);
  const processingTimes = useRef<number[]>([]);

  /**
   * Process multiple customer IDs in optimized batches
   */
  const processBulkCustomerIds = useCallback(async (
    customerIds: string[],
    token: string,
    existingProfiles: CustomerProfile[],
    options: Partial<BulkProcessingOptions> = {}
  ): Promise<CustomerProfile[]> => {
    const config: BulkProcessingOptions = {
      batchSize: 12, // Increased batch size by 50% (8 × 1.5 = 12)
      maxConcurrent: 12,
      retryAttempts: 3,
      delayBetweenBatches: 200, // Small delay to prevent overwhelming the API
      onProgress: () => {},
      onProfileProcessed: () => {},
      onDebugLog: () => {},
      ...options
    };

    // Initialize processing state
    const startTime = Date.now();
    const totalBatches = Math.ceil(customerIds.length / config.batchSize);
    
    abortController.current = new AbortController();
    processingTimes.current = [];

    const initialState: BulkProcessingState = {
      isProcessing: true,
      totalItems: customerIds.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      duplicateItems: 0,
      currentBatch: 0,
      totalBatches,
      startTime,
      estimatedTimeRemaining: 0,
      averageProcessingTime: 0,
      errors: []
    };

    setProcessingState(initialState);
    config.onProgress(initialState);

    config.onDebugLog('info', '🚀 Bulk Processing Started', {
      totalCustomers: customerIds.length,
      batchSize: config.batchSize,
      totalBatches,
      existingProfiles: existingProfiles.length
    });

    const results: CustomerProfile[] = [];
    const existingCustomerIds = new Set(existingProfiles.map(p => p.customerId));

    try {
      // Process in batches for optimal performance
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        if (abortController.current?.signal.aborted) {
          throw new Error('Processing aborted by user');
        }

        const batchStart = batchIndex * config.batchSize;
        const batchEnd = Math.min(batchStart + config.batchSize, customerIds.length);
        const batchIds = customerIds.slice(batchStart, batchEnd);

        config.onDebugLog('info', `📦 Processing Batch ${batchIndex + 1}/${totalBatches}`, {
          batchSize: batchIds.length,
          customerIds: batchIds,
          progress: `${batchStart + 1}-${batchEnd} of ${customerIds.length}`
        });

        const batchStartTime = Date.now();

        // Process batch concurrently (5-10 requests at once)
        const batchResults = await processBatchConcurrently(
          batchIds,
          token,
          existingCustomerIds,
          config,
          abortController.current.signal
        );

        const batchProcessingTime = Date.now() - batchStartTime;
        processingTimes.current.push(batchProcessingTime);

        // Update results and state
        results.push(...batchResults.profiles);

        const currentState: BulkProcessingState = {
          ...processingState,
          processedItems: batchEnd,
          successfulItems: results.length,
          failedItems: batchResults.failures.length,
          duplicateItems: batchResults.duplicates,
          currentBatch: batchIndex + 1,
          averageProcessingTime: calculateAverageProcessingTime(),
          estimatedTimeRemaining: calculateEstimatedTimeRemaining(batchIndex + 1, totalBatches),
          errors: [...processingState.errors, ...batchResults.failures]
        };

        setProcessingState(currentState);
        config.onProgress(currentState);

        config.onDebugLog('success', `✅ Batch ${batchIndex + 1} Completed`, {
          processedInBatch: batchIds.length,
          successfulInBatch: batchResults.profiles.length,
          failedInBatch: batchResults.failures.length,
          duplicatesInBatch: batchResults.duplicates,
          batchTime: batchProcessingTime,
          totalProgress: `${batchEnd}/${customerIds.length}`
        });

        // Small delay between batches to respect rate limits
        if (batchIndex < totalBatches - 1 && config.delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      const finalState: BulkProcessingState = {
        ...processingState,
        isProcessing: false,
        processedItems: customerIds.length,
        successfulItems: results.length,
        estimatedTimeRemaining: 0
      };

      setProcessingState(finalState);
      config.onProgress(finalState);

      config.onDebugLog('success', '🎉 Bulk Processing Completed', {
        totalProcessed: customerIds.length,
        successful: results.length,
        failed: finalState.failedItems,
        duplicates: finalState.duplicateItems,
        totalTime: totalProcessingTime,
        averagePerProfile: totalProcessingTime / customerIds.length,
        profilesPerSecond: (results.length / (totalProcessingTime / 1000)).toFixed(2)
      });

      toast({
        title: "Bulk Processing Complete",
        description: `Successfully processed ${results.length} profiles in ${(totalProcessingTime / 1000).toFixed(1)}s`,
      });

      return results;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      config.onDebugLog('error', '❌ Bulk Processing Failed', {
        error: errorMessage,
        processedSoFar: processingState.processedItems,
        totalItems: customerIds.length
      });

      setProcessingState(prev => ({
        ...prev,
        isProcessing: false
      }));

      toast({
        title: "Bulk Processing Failed",
        description: errorMessage,
        variant: "destructive",
      });

      throw error;
    }
  }, [processingState, toast]);

  /**
   * Process a single batch with concurrent requests (5-10 at once)
   */
  const processBatchConcurrently = async (
    batchIds: string[],
    token: string,
    existingCustomerIds: Set<string>,
    config: BulkProcessingOptions,
    abortSignal: AbortSignal
  ): Promise<{
    profiles: CustomerProfile[];
    failures: Array<{ customerId: string; error: string; attempt: number }>;
    duplicates: number;
  }> => {
    const profiles: CustomerProfile[] = [];
    const failures: Array<{ customerId: string; error: string; attempt: number }> = [];
    let duplicates = 0;

    // Process all items in the batch concurrently
    const promises = batchIds.map(async (customerId) => {
      if (abortSignal.aborted) {
        throw new Error('Aborted');
      }

      // Check for existing profile (duplicate detection)
      const isDuplicate = existingCustomerIds.has(customerId);
      if (isDuplicate) {
        duplicates++;
        config.onDebugLog('info', '🔍 Duplicate Detected', {
          customerId,
          action: 'skipped'
        });
        return null;
      }

      // Retry logic for individual profile
      for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
        try {
          config.onDebugLog('info', `🔄 Processing Customer ${customerId}`, {
            attempt,
            maxAttempts: config.retryAttempts
          });

          const profile = await BrandsForLessService.fetchCustomerProfile(customerId, token);
          
          if (profile) {
            profiles.push(profile);
            existingCustomerIds.add(customerId); // Prevent duplicates within same batch
            
            config.onProfileProcessed(profile, false);
            config.onDebugLog('success', `✅ Profile Fetched: ${customerId}`, {
              customerName: profile.fullName,
              totalOrders: profile.totalOrdersCount,
              totalValue: profile.totalPurchasesAmount
            });
            
            return profile;
          } else {
            throw new Error('No profile data returned');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          config.onDebugLog('warning', `⚠️ Attempt ${attempt} Failed: ${customerId}`, {
            error: errorMessage,
            willRetry: attempt < config.retryAttempts
          });

          if (attempt === config.retryAttempts) {
            failures.push({
              customerId,
              error: errorMessage,
              attempt
            });
            
            config.onDebugLog('error', `❌ All Attempts Failed: ${customerId}`, {
              finalError: errorMessage,
              totalAttempts: attempt
            });
          } else {
            // Exponential backoff for retries
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      return null;
    });

    // Wait for all concurrent requests to complete
    await Promise.allSettled(promises);

    return { profiles, failures, duplicates };
  };

  /**
   * Calculate average processing time per profile
   */
  const calculateAverageProcessingTime = (): number => {
    if (processingTimes.current.length === 0) return 0;
    const total = processingTimes.current.reduce((sum, time) => sum + time, 0);
    return total / processingTimes.current.length;
  };

  /**
   * Calculate estimated time remaining
   */
  const calculateEstimatedTimeRemaining = (currentBatch: number, totalBatches: number): number => {
    if (processingTimes.current.length === 0) return 0;
    
    const averageBatchTime = calculateAverageProcessingTime();
    const remainingBatches = totalBatches - currentBatch;
    
    return remainingBatches * averageBatchTime;
  };

  /**
   * Cancel ongoing bulk processing
   */
  const cancelProcessing = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort();
      
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false
      }));

      toast({
        title: "Processing Cancelled",
        description: "Bulk processing has been stopped",
        variant: "destructive",
      });
    }
  }, [toast]);

  /**
   * Reset processing state
   */
  const resetProcessingState = useCallback(() => {
    setProcessingState({
      isProcessing: false,
      totalItems: 0,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      duplicateItems: 0,
      currentBatch: 0,
      totalBatches: 0,
      startTime: 0,
      estimatedTimeRemaining: 0,
      averageProcessingTime: 0,
      errors: []
    });
    processingTimes.current = [];
  }, []);

  return {
    processingState,
    processBulkCustomerIds,
    cancelProcessing,
    resetProcessingState
  };
};