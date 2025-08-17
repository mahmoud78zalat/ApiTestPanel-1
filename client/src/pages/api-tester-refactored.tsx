/**
 * Refactored API Tester Page
 * 
 * This is the completely refactored version of the API tester using modular components
 * and custom hooks for better maintainability and separation of concerns
 */

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Custom Hooks
import { useApiRequest } from "@/hooks/use-api-request";
import { useDebugLogging } from "@/hooks/use-debug-logging";
import { useBulkProcessing } from "@/hooks/use-bulk-processing";
import { useProfileCollection } from "@/hooks/use-profile-collection";
import { usePerformanceMonitoring } from "@/hooks/use-performance-monitoring";

// Components
import { ApiRequestForm } from "@/components/api-request-form";
import { ApiResponseDisplay } from "@/components/api-response-display";
import { BulkResultsPanel } from "@/components/bulk-results-panel";
import { DebugPanel } from "@/components/debug-panel";
import { PerformanceMonitor } from "@/components/performance-monitor";

// Features
import { ProfileManagement } from "@/features/profile-management";
import { UploadDialog } from "@/features/upload-dialog";

// Config and Utils
import { API_ENDPOINTS } from "@/config/api-endpoints";
import { constructUrl } from "@/utils/url-utils";

export default function ApiTesterRefactored() {
  const { toast } = useToast();

  // Core API request functionality
  const {
    url,
    method,
    token,
    response,
    error,
    selectedEndpoint,
    parameters,
    showCustomUrl,
    setUrl,
    setMethod,
    setToken,
    setSelectedEndpoint,
    setParameters,
    setShowCustomUrl,
    makeRequest,
    fetchFullProfile,
    resetForm,
    updateUrlFromEndpoint,
    isLoading,
    isProfileLoading
  } = useApiRequest();

  // Enhanced debug logging with detailed process tracking
  const {
    debugLogs,
    showDebugPanel,
    addDebugLog,
    clearDebugLogs,
    toggleDebugPanel,
    setShowDebugPanel,
    logProcessStep,
    logApiRequest,
    logApiResponse,
    logDuplicateDetection
  } = useDebugLogging();

  // Bulk processing with new professional system
  const {
    processingState,
    processBulkCustomerIds,
    cancelProcessing,
    resetProcessingState
  } = useBulkProcessing();

  // Profile collection with duplicate tracking
  const {
    collectedProfiles,
    showUploadDialog,
    setShowUploadDialog,
    addProfile,
    addProfiles,
    removeProfile,
    clearProfiles,
    exportProfiles,
    importFromFile,
    getCollectionStats,
    duplicateCount
  } = useProfileCollection();

  // Performance monitoring
  const {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    recordRequest,
    updateMetrics,
    resetMetrics,
    updateCacheStats
  } = usePerformanceMonitoring();

  // Local state for bulk mode
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  // Wrap API functions to track performance
  const trackPerformance = async (operation: () => Promise<any>) => {
    const startTime = Date.now();
    try {
      const result = await operation();
      const responseTime = Date.now() - startTime;
      const dataSize = JSON.stringify(result || '').length;
      recordRequest(true, responseTime, dataSize, false);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      recordRequest(false, responseTime, 0, false);
      throw error;
    }
  };

  // Update URL when endpoint or parameters change
  useEffect(() => {
    updateUrlFromEndpoint();
  }, [updateUrlFromEndpoint]);

  // Log API responses for debugging
  useEffect(() => {
    if (response) {
      addDebugLog('response', 'API Response Received', response);
    }
  }, [response, url, method, addDebugLog]);

  // Log API errors for debugging
  useEffect(() => {
    if (error) {
      addDebugLog('error', 'API Request Failed', { error });
    }
  }, [error, url, method, addDebugLog]);

  /**
   * Handles form submission for both single and bulk requests
   */
  const handleSubmit = async () => {
    if (!bulkMode) {
      // Single request mode
      startMonitoring(1);
      addDebugLog('request', 'Single API Request', { url, method, token });
      
      const currentEndpoint = API_ENDPOINTS.find(ep => ep.id === selectedEndpoint);
      
      // Handle special "fetch-full-profile" endpoint
      if (currentEndpoint?.id === 'fetch-full-profile') {
        const customerId = parameters[currentEndpoint.parameters[0].key];
        if (!customerId) {
          toast({
            title: "Missing Parameter",
            description: "Customer ID is required for full profile fetch",
            variant: "destructive",
          });
          stopMonitoring();
          return;
        }

        try {
          const profile = await trackPerformance(async () => await fetchFullProfile(customerId));
          if (profile) {
            addProfile(profile);
            toast({
              title: "Profile Collected",
              description: `Successfully collected profile for customer ${customerId}`,
            });
          }
          stopMonitoring();
        } catch (error) {
          stopMonitoring();
          console.error('Profile fetch failed:', error);
        }
      } else {
        // Regular single request with performance tracking
        try {
          await trackPerformance(async () => await makeRequest());
          stopMonitoring();
        } catch (error) {
          stopMonitoring();
          console.error('API request failed:', error);
        }
      }
    } else {
      // Bulk processing mode
      const parseBulkInput = (input: string): string[] => {
        return input
          .split(/[,\n\r\t\s]+/)
          .map(id => id.trim())
          .filter(id => id.length > 0);
      };

      const values = parseBulkInput(bulkInput);
      if (values.length === 0) {
        toast({
          title: "No Values to Process",
          description: "Please enter values for bulk processing",
          variant: "destructive",
        });
        return;
      }

      const currentEndpoint = API_ENDPOINTS.find(ep => ep.id === selectedEndpoint);
      if (!currentEndpoint) {
        toast({
          title: "No Endpoint Selected",
          description: "Please select an endpoint for bulk processing",
          variant: "destructive",
        });
        return;
      }

      // Handle bulk full profile fetching with optimized batching
      if (currentEndpoint.id === 'fetch-full-profile') {
        handleBulkProcessing(values);
      } else {
        toast({
          title: "Bulk Mode Available",
          description: "Currently only full profile fetching supports bulk mode",
          variant: "destructive",
        });
      }
    }
  };

  // Enhanced bulk processing function using the new professional system
  const handleBulkProcessing = async (customerIds: string[]) => {
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please provide an authentication token",
        variant: "destructive",
      });
      return;
    }

    setShowDebugPanel(true);
    startMonitoring(customerIds.length);
    
    // Initialize performance monitoring with correct total count
    updateMetrics({
      totalItems: customerIds.length,
      processedItems: 0,
      successfulItems: 0,
      failedItems: 0,
      averageProcessingTime: 0,
      activeConnections: 0
    });
    
    logProcessStep(1, "Bulk Processing Initialization", {
      totalCustomers: customerIds.length,
      batchingEnabled: true,
      concurrentRequests: 12
    }, 'started');

    try {
      const results = await processBulkCustomerIds(
        customerIds,
        token,
        collectedProfiles,
        {
          batchSize: 6,
          maxConcurrent: 6,
          retryAttempts: 3,
          delayBetweenBatches: 200,
          onProgress: (state) => {
            // Update performance monitoring with accurate progress
            updateMetrics({
              totalItems: state.totalItems,
              processedItems: state.processedItems,
              successfulItems: state.successfulItems,
              failedItems: state.failedItems,
              averageProcessingTime: state.averageProcessingTime || 0,
              activeConnections: Math.min(state.currentBatch || 0, 6)
            });
            
            logProcessStep(
              state.currentBatch + 1, 
              `Processing Batch ${state.currentBatch + 1}/${state.totalBatches}`, 
              {
                processed: state.processedItems,
                successful: state.successfulItems,
                failed: state.failedItems,
                duplicates: state.duplicateItems,
                estimatedTimeRemaining: state.estimatedTimeRemaining,
                batchSize: 12
              },
              'progress'
            );
          },
          onProfileProcessed: (profile, isDuplicate) => {
            if (isDuplicate) {
              logDuplicateDetection(profile.customerId, 'detected');
            }
            addProfile(profile, (customerId) => {
              logDuplicateDetection(customerId, 'updated');
            });
          },
          onDebugLog: (level, message, data) => {
            addDebugLog(level as any, message, data);
          }
        }
      );

      logProcessStep(customerIds.length, "Bulk Processing Completed", {
        totalProcessed: customerIds.length,
        successful: results.length,
        profilesCollected: collectedProfiles.length + results.length,
        duplicatesFound: duplicateCount
      }, 'completed');

      stopMonitoring();

      toast({
        title: "Bulk Processing Complete",
        description: `Successfully processed ${results.length} customer profiles`,
      });

    } catch (error) {
      logProcessStep(0, "Bulk Processing Failed", {
        error: error instanceof Error ? error.message : 'Unknown error',
        partialResults: processingState.processedItems
      }, 'failed');

      stopMonitoring();
      
      toast({
        title: "Bulk Processing Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          API Testing Panel
        </h1>
        <p className="text-gray-600">
          Professional API testing interface for Brands for Less endpoints
        </p>
      </div>

      {/* Main API Request Form */}
      <ApiRequestForm
        url={url}
        method={method}
        token={token}
        selectedEndpoint={selectedEndpoint}
        parameters={parameters}
        showCustomUrl={showCustomUrl}
        bulkMode={bulkMode}
        bulkInput={bulkInput}
        isLoading={isLoading || isProfileLoading}
        onUrlChange={setUrl}
        onMethodChange={setMethod}
        onTokenChange={setToken}
        onEndpointChange={setSelectedEndpoint}
        onParametersChange={setParameters}
        onShowCustomUrlToggle={setShowCustomUrl}
        onBulkModeToggle={setBulkMode}
        onBulkInputChange={setBulkInput}
        onSubmit={handleSubmit}
        onReset={resetForm}
      />

      {/* API Response Display */}
      <ApiResponseDisplay
        response={response}
        error={error}
        isLoading={isLoading}
      />

      {/* Bulk Results Display - shows when bulk processing completes */}
      {processingState.isProcessing && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Bulk Processing in Progress...
          </h3>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <div>Processing {processingState.processedItems} of {processingState.totalItems}</div>
            <div>Successful: {processingState.successfulItems}</div>
            <div>Failed: {processingState.failedItems}</div>
            <div>Duplicates: {processingState.duplicateItems}</div>
          </div>
        </div>
      )}

      {/* Customer Profile Collection */}
      <ProfileManagement
        profiles={collectedProfiles}
        onRemoveProfile={removeProfile}
        onClearProfiles={clearProfiles}
        onExportProfiles={exportProfiles}
        onShowUpload={() => setShowUploadDialog(true)}
      />

      {/* Debug Console */}
      <DebugPanel
        logs={debugLogs}
        isVisible={showDebugPanel}
        onToggleVisibility={toggleDebugPanel}
        onClearLogs={clearDebugLogs}
      />

      {/* Performance Monitor */}
      <PerformanceMonitor
        metrics={metrics}
        isActive={isMonitoring}
        onReset={resetMetrics}
        showDetails={bulkMode}
        duplicateCount={duplicateCount}
      />

      {/* Upload Dialog */}
      <UploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onFileProcessed={handleBulkProcessing}
      />
    </div>
  );
}