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
  isPaused: boolean;
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
  checkpoint: {
    processedCustomerIds: string[];
    remainingCustomerIds: string[];
    collectedProfiles: CustomerProfile[];
    performanceState?: {
      startTime: number;
      processedSoFar: number;
      processingTimes: number[];
    };
  } | null;
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
    isPaused: false,
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
    errors: [],
    checkpoint: null
  });

  const abortController = useRef<AbortController | null>(null);
  const processingTimes = useRef<number[]>([]);
  const shouldStop = useRef(false);
  const shouldPause = useRef(false);

  /**
   * Process multiple customer IDs in optimized batches
   */
  const processBulkCustomerIds = useCallback(async (
    customerIds: string[],
    token: string,
    existingProfiles: CustomerProfile[],
    options: Partial<BulkProcessingOptions & { 
      preservedStartTime?: number;
      preservedProcessedCount?: number;
      originalTotalCount?: number;
    }> = {}
  ): Promise<CustomerProfile[]> => {
    const config: BulkProcessingOptions = {
      batchSize: 6, // Reduced for stability and to prevent freezing  
      maxConcurrent: 6,
      retryAttempts: 2,
      delayBetweenBatches: 300, // Increased delay to prevent overwhelming the API
      onProgress: () => {},
      onProfileProcessed: () => {},
      onDebugLog: () => {},
      ...options
    };

    // Initialize processing state and reset ALL flags
    const startTime = options.preservedStartTime || Date.now();
    const totalBatches = Math.ceil(customerIds.length / config.batchSize);
    const originalTotalCount = options.originalTotalCount || customerIds.length;
    const preservedProcessedCount = options.preservedProcessedCount || 0;
    
    // Reset ALL flags and create new abort controller for this processing session
    shouldStop.current = false;
    shouldPause.current = false;
    processingTimes.current = [];
    abortController.current = new AbortController();

    const initialState: BulkProcessingState = {
      isProcessing: true,
      isPaused: false,
      totalItems: originalTotalCount,
      processedItems: preservedProcessedCount,
      successfulItems: preservedProcessedCount,
      failedItems: 0,
      duplicateItems: 0,
      currentBatch: Math.ceil(preservedProcessedCount / config.batchSize),
      totalBatches: Math.ceil(originalTotalCount / config.batchSize),
      startTime,
      estimatedTimeRemaining: 0,
      averageProcessingTime: 0,
      errors: [],
      checkpoint: null
    };

    setProcessingState(initialState);
    
    // Immediately call onProgress with initial state to update performance monitoring
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
        // Check for pause request at the start of each batch (but skip on resume)
        if ((shouldPause.current || abortController.current?.signal.aborted) && batchIndex > 0) {
          const remainingBatchIndex = batchIndex;
          const remainingIds = customerIds.slice(remainingBatchIndex * config.batchSize);
          
          // Create checkpoint for smooth resume (including performance monitor state)
          const checkpoint = {
            processedCustomerIds: customerIds.slice(0, remainingBatchIndex * config.batchSize),
            remainingCustomerIds: remainingIds,
            collectedProfiles: results,
            // Preserve performance monitor state for accurate resume
            performanceState: {
              startTime: startTime,
              processedSoFar: results.length,
              processingTimes: [...processingTimes.current]
            }
          };
          
          setProcessingState(prev => ({
            ...prev,
            isProcessing: false,
            isPaused: true,
            checkpoint
          }));
          
          config.onDebugLog('info', '⏸️ Processing Paused at Checkpoint', {
            processedSoFar: results.length,
            remainingItems: remainingIds.length,
            batchIndex,
            checkpointCreated: true,
            reason: shouldPause.current ? 'User pause requested' : 'Abort signal triggered'
          });
          
          return results; // EXIT with current results
        }
        
        // Check if processing should be stopped (but not if we just started)
        if ((abortController.current?.signal.aborted || shouldStop.current) && batchIndex > 0) {
          throw new Error('Processing stopped by user');
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

        // Process batch concurrently (5-10 requests at once) with abort monitoring
        let batchResults;
        try {
          batchResults = await processBatchConcurrently(
            batchIds,
            token,
            existingCustomerIds,
            config,
            abortController.current.signal
          );
          
          // Check for pause/stop after batch completes (but not on first batch of resume)
          if ((shouldPause.current || abortController.current?.signal.aborted) && batchIndex > 0) {
            config.onDebugLog('info', '⏸️ Batch completed but pausing requested', {
              batchJustCompleted: batchIndex + 1,
              nextBatch: batchIndex + 2,
              totalBatches
            });
            
            // Update results with this batch and create checkpoint
            results.push(...batchResults.profiles);
            
            const remainingIds = customerIds.slice((batchIndex + 1) * config.batchSize);
            const checkpoint = {
              processedCustomerIds: customerIds.slice(0, (batchIndex + 1) * config.batchSize),
              remainingCustomerIds: remainingIds,
              collectedProfiles: results,
              // Preserve performance monitor state for accurate resume
              performanceState: {
                startTime: startTime,
                processedSoFar: results.length,
                processingTimes: [...processingTimes.current]
              }
            };
            
            setProcessingState(prev => ({
              ...prev,
              isProcessing: false,
              isPaused: true,
              processedItems: results.length,
              checkpoint
            }));
            
            return results; // EXIT with updated results
          }
          
          // Continue normal processing
          const batchProcessingTime = Date.now() - batchStartTime;
          processingTimes.current.push(batchProcessingTime);

          // Update results and state
          results.push(...batchResults.profiles);

          const currentState: BulkProcessingState = {
            ...processingState,
            isProcessing: true,
            isPaused: false,
            totalItems: originalTotalCount, // Ensure total stays consistent
            processedItems: preservedProcessedCount + batchEnd,
            successfulItems: preservedProcessedCount + results.length,
            failedItems: batchResults?.failures?.length || 0,
            duplicateItems: batchResults?.duplicates || 0,
            currentBatch: Math.ceil((preservedProcessedCount + batchEnd) / config.batchSize),
            averageProcessingTime: calculateAverageProcessingTime(),
            estimatedTimeRemaining: calculateEstimatedTimeRemaining(batchIndex + 1, totalBatches),
            errors: [...processingState.errors, ...(batchResults?.failures || [])],
            checkpoint: null // Clear any previous checkpoint since we're actively processing
          };

          setProcessingState(currentState);
          config.onProgress(currentState);

          config.onDebugLog('success', `✅ Batch ${batchIndex + 1} Completed`, {
            processedInBatch: batchIds.length,
            successfulInBatch: batchResults?.profiles?.length || 0,
            failedInBatch: batchResults?.failures?.length || 0,
            duplicatesInBatch: batchResults?.duplicates || 0,
            batchTime: batchProcessingTime,
            totalProgress: `${batchEnd}/${customerIds.length}`
          });
        } catch (error) {
          if (error instanceof Error && error.message.includes('aborted')) {
            config.onDebugLog('info', '⏸️ Batch processing aborted - creating checkpoint', {
              batchIndex: batchIndex + 1,
              currentResults: results.length
            });
            
            // Create checkpoint even on abort (including performance monitor state)
            const remainingIds = customerIds.slice(batchIndex * config.batchSize);
            const checkpoint = {
              processedCustomerIds: customerIds.slice(0, batchIndex * config.batchSize),
              remainingCustomerIds: remainingIds,
              collectedProfiles: results,
              // Preserve performance monitor state for accurate resume
              performanceState: {
                startTime: startTime,
                processedSoFar: results.length,
                processingTimes: [...processingTimes.current]
              }
            };
            
            setProcessingState(prev => ({
              ...prev,
              isProcessing: false,
              isPaused: true,
              processedItems: results.length,
              checkpoint
            }));
            
            return results; // Return current results on abort
          }
          
          throw error; // Re-throw non-abort errors
        }

        // Small delay between batches to respect rate limits
        if (batchIndex < totalBatches - 1 && config.delayBetweenBatches > 0) {
          await new Promise(resolve => setTimeout(resolve, config.delayBetweenBatches));
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      const finalState: BulkProcessingState = {
        ...processingState,
        isProcessing: false,
        processedItems: preservedProcessedCount + customerIds.length,
        successfulItems: preservedProcessedCount + results.length,
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
      
      // Don't show error for intentional stops
      if (errorMessage.includes('Processing stopped by user')) {
        config.onDebugLog('info', '⏹️ Processing stopped by user request', {
          processedSoFar: results.length,
          totalItems: customerIds.length
        });
        
        // Create a checkpoint with remaining items so user can resume
        const processedCount = results.length;
        const remainingIds = customerIds.slice(processedCount);
        
        const checkpoint = {
          processedCustomerIds: customerIds.slice(0, processedCount),
          remainingCustomerIds: remainingIds,
          collectedProfiles: results,
          // Preserve performance monitor state for accurate resume
          performanceState: {
            startTime: startTime,
            processedSoFar: results.length,
            processingTimes: [...processingTimes.current]
          }
        };
        
        setProcessingState(prev => ({
          ...prev,
          isProcessing: false,
          isPaused: true, // Allow resuming
          processedItems: processedCount,
          checkpoint: checkpoint // Ensure checkpoint is preserved
        }));
        
        return results; // Return what we've processed so far
      }
      
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

    // Process all items in the batch concurrently with abort checking
    const promises = batchIds.map(async (customerId) => {
      // Check for abort signal at the start of each request
      if (abortSignal.aborted) {
        throw new Error('Processing aborted by user');
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
        // Check for abort before each attempt
        if (abortSignal.aborted) {
          throw new Error('Processing aborted by user');
        }

        try {
          config.onDebugLog('info', `🔄 Processing Customer ${customerId}`, {
            attempt,
            maxAttempts: config.retryAttempts
          });

          const profile = await BrandsForLessService.fetchCustomerProfile(customerId, token);
          
          // Critical: Check abort signal immediately after API call completes
          if (abortSignal.aborted) {
            throw new Error('Processing aborted by user');
          }
          
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
            // Skip customers with no valid data - don't treat as error
            config.onDebugLog('info', `⏭️ Skipped: ${customerId}`, {
              reason: 'No valid customer data found'
            });
            return null;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // If it's an abort error, don't retry - just throw it up immediately
          if (errorMessage.includes('aborted') || abortSignal.aborted) {
            throw new Error('Processing aborted by user');
          }
          
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
            // Check abort before retry delay
            if (abortSignal.aborted) {
              throw new Error('Processing aborted by user');
            }
            
            // Exponential backoff for retries
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Check abort after delay
            if (abortSignal.aborted) {
              throw new Error('Processing aborted by user');
            }
          }
        }
      }
      return null;
    });

    try {
      // Wait for all concurrent requests to complete but check abort signal frequently
      const results = await Promise.allSettled(promises);
      
      // If aborted during processing, throw immediately
      if (abortSignal.aborted) {
        throw new Error('Processing aborted by user');
      }
      
      // Filter out nulls and failed promises - we only want actual profiles
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value === null) {
          // This was a skipped customer (no valid data), don't count as failure
          config.onDebugLog('info', `⏭️ Customer skipped (no valid data): ${batchIds[index]}`);
        } else if (result.status === 'rejected') {
          const errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error';
          // Check if it's an abort error - if so, propagate it up
          if (errorMessage.includes('aborted')) {
            throw new Error('Processing aborted by user');
          }
        }
      });

      return { profiles, failures, duplicates };
    } catch (error) {
      // If it's an abort error, make sure to clean up and throw it properly
      if (error instanceof Error && error.message.includes('aborted')) {
        config.onDebugLog('info', '⏸️ Batch Processing Aborted', {
          batchSize: batchIds.length,
          reason: 'User requested pause'
        });
        throw error;
      }
      
      // For other errors, log and re-throw
      config.onDebugLog('error', '❌ Batch Processing Failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        batchSize: batchIds.length
      });
      throw error;
    }
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
   * Smoothly pause ongoing bulk processing and create checkpoint
   */
  const pauseProcessing = useCallback(() => {
    shouldPause.current = true;
    
    setProcessingState(prev => ({
      ...prev,
      isProcessing: false,
      isPaused: true
    }));

    toast({
      title: "Processing Paused",
      description: "Processing has been paused. You can resume from this point anytime.",
    });
  }, [toast]);

  /**
   * Resume processing from the last checkpoint
   */
  const resumeProcessing = useCallback(async (
    token: string,
    existingProfiles: CustomerProfile[],
    options: Partial<BulkProcessingOptions & {
      newItemsToProcess?: string[]; // Allow passing new items to process instead of checkpoint remaining
    }> = {}
  ) => {
    if (!processingState.checkpoint) {
      toast({
        title: "No Checkpoint Found",
        description: "Cannot resume - no checkpoint data available",
        variant: "destructive",
      });
      return [];
    }

    // Immediately update state to show we're resuming
    setProcessingState(prev => ({
      ...prev,
      isProcessing: true,
      isPaused: false
    }));

    // Reset all stop and pause flags before resuming (synchronously)
    shouldPause.current = false;
    shouldStop.current = false;
    
    try {
      // Resume from checkpoint with preserved performance state
      const checkpoint = processingState.checkpoint;
      const preservedPerformance = checkpoint.performanceState;
      
      // Restore processing times for accurate performance calculations
      if (preservedPerformance) {
        processingTimes.current = [...preservedPerformance.processingTimes];
      }
      
      // For resume: directly update the processing state to continue from checkpoint
      const itemsToProcess = options.newItemsToProcess || checkpoint.remainingCustomerIds;
      const alreadyProcessed = preservedPerformance?.processedSoFar || 0;
      const totalCount = alreadyProcessed + itemsToProcess.length;
      
      console.log('[Resume Processing] Continuing from checkpoint - Items remaining:', itemsToProcess.length, 'Already processed:', alreadyProcessed, 'Total:', totalCount);
      
      // Set the processing state to reflect we're resuming from checkpoint
      setProcessingState(prev => ({
        ...prev,
        isProcessing: true,
        isPaused: false,
        totalItems: totalCount,
        processedItems: alreadyProcessed, // Start from where we left off
        successfulItems: alreadyProcessed,
        currentBatch: Math.ceil(alreadyProcessed / 6), // Continue batch count
        totalBatches: Math.ceil(totalCount / 6),
        checkpoint: null // Clear checkpoint since we're resuming
      }));
      
      const results = await processBulkCustomerIds(
        itemsToProcess,
        token,
        [...existingProfiles, ...checkpoint.collectedProfiles],
        {
          ...options,
          // Pass preserved performance state for resume
          preservedStartTime: preservedPerformance?.startTime,
          preservedProcessedCount: alreadyProcessed,
          // Keep original total count consistent
          originalTotalCount: totalCount
        }
      );
      return results;
    } catch (error) {
      // If resume fails, restore paused state
      setProcessingState(prev => ({
        ...prev,
        isProcessing: false,
        isPaused: true
      }));
      throw error;
    }
  }, [processingState.checkpoint, toast, processBulkCustomerIds]);

  /**
   * Completely reset processing state and clear checkpoints
   */
  const resetProcessing = useCallback(() => {
    shouldStop.current = false;
    shouldPause.current = false;
    
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    
    setProcessingState({
      isProcessing: false,
      isPaused: false,
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
      errors: [],
      checkpoint: null
    });
    
    processingTimes.current = [];
  }, []);

  /**
   * Reset processing state
   */
  const resetProcessingState = useCallback(() => {
    setProcessingState({
      isProcessing: false,
      isPaused: false,
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
      errors: [],
      checkpoint: null
    });
    processingTimes.current = [];
  }, []);

  /**
   * Stop processing by setting the stop flag and updating state immediately
   * Creates a checkpoint so processing can be resumed later
   */
  const stopProcessing = useCallback(() => {
    shouldStop.current = true;
    if (abortController.current) {
      abortController.current.abort();
    }
    
    // Don't immediately update state here - let the processing loop handle checkpoint creation
    // This ensures the checkpoint is properly created with the right data
    
    toast({
      title: "Processing Stopped",
      description: "Processing has been stopped. You can resume from this point anytime.",
    });
  }, [toast]);

  return {
    processingState,
    processBulkCustomerIds,
    pauseProcessing,
    stopProcessing,
    resumeProcessing,
    resetProcessing,
    isProcessing: processingState.isProcessing,
    isPaused: processingState.isPaused,
    hasCheckpoint: !!processingState.checkpoint,
    totalItems: processingState.totalItems,
    processedItems: processingState.processedItems
  };
};