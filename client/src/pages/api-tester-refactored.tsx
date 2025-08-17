/**
 * Refactored API Tester Page
 * 
 * This is the completely refactored version of the API tester using modular components
 * and custom hooks for better maintainability and separation of concerns
 */

import { useEffect } from "react";
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

  // Debug logging
  const {
    debugLogs,
    showDebugPanel,
    addDebugLog,
    clearDebugLogs,
    toggleDebugPanel,
    setShowDebugPanel
  } = useDebugLogging();

  // Bulk processing
  const {
    bulkMode,
    bulkInput,
    bulkResults,
    setBulkMode,
    setBulkInput,
    bulkProcessingMutation,
    parseBulkInput,
    clearBulkResults,
    getBulkSummary
  } = useBulkProcessing();

  // Profile collection
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
    getCollectionStats
  } = useProfileCollection();

  // Performance monitoring
  const {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    recordRequest,
    resetMetrics,
    updateCacheStats
  } = usePerformanceMonitoring();

  // Wrap API functions to track performance
  const trackPerformance = async (operation: () => Promise<any>, operationName: string) => {
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
      addDebugLog('response', 'API Response Received', response, url, method);
    }
  }, [response, url, method, addDebugLog]);

  // Log API errors for debugging
  useEffect(() => {
    if (error) {
      addDebugLog('error', 'API Request Failed', { error }, url, method);
    }
  }, [error, url, method, addDebugLog]);

  /**
   * Handles form submission for both single and bulk requests
   */
  const handleSubmit = async () => {
    if (!bulkMode) {
      // Single request mode
      startMonitoring(1);
      addDebugLog('request', 'Single API Request', { url, method, token }, url, method);
      
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
          const profile = await trackPerformance(() => fetchFullProfile(customerId, token), 'fetchFullProfile');
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
          await trackPerformance(() => makeRequest(), 'makeRequest');
          stopMonitoring();
        } catch (error) {
          stopMonitoring();
          console.error('API request failed:', error);
        }
      }
    } else {
      // Bulk processing mode
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

      // Start performance monitoring for bulk operations
      startMonitoring(values.length);
      addDebugLog('request', 'Optimized Bulk Processing Started', { 
        endpoint: currentEndpoint.name, 
        valueCount: values.length,
        batchSize: 8,
        parallelProcessing: true
      });

      // Handle bulk full profile fetching with optimized batching
      if (currentEndpoint.id === 'fetch-full-profile') {
        try {
          const startTime = Date.now();
          
          // Use optimized batch processing from BrandsForLessService
          const results = await Promise.all(
            values.map(async customerId => {
              const profileStartTime = Date.now();
              try {
                const profile = await trackPerformance(() => fetchFullProfile(customerId, token), 'fetchFullProfile');
                return profile;
              } catch (error) {
                return null;
              }
            })
          );
          
          const validProfiles = results.filter(Boolean);
          addProfiles(validProfiles);
          stopMonitoring();
          
          toast({
            title: "Bulk Processing Complete",
            description: `Successfully processed ${validProfiles.length} out of ${values.length} profiles with optimized batching`,
          });
        } catch (error) {
          stopMonitoring();
          console.error('Bulk profile fetch failed:', error);
        }
      } else {
        // Regular bulk processing with performance monitoring
        bulkProcessingMutation.mutate({
          values,
          endpoint: currentEndpoint,
          token
        });
      }
    }
  };

  /**
   * Handles file upload for importing customer IDs
   */
  const handleFileUpload = async (customerIds: string[]) => {
    if (customerIds.length === 0) return;

    setBulkInput(customerIds.join('\n'));
    setBulkMode(true);
    
    // Auto-select fetch-full-profile endpoint
    setSelectedEndpoint('fetch-full-profile');
    
    toast({
      title: "IDs Imported",
      description: `${customerIds.length} customer IDs imported and bulk mode enabled`,
    });
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
        isLoading={isLoading || isProfileLoading || bulkProcessingMutation.isPending}
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

      {/* Bulk Processing Results */}
      {bulkResults.length > 0 && (
        <BulkResultsPanel
          results={bulkResults}
          isProcessing={bulkProcessingMutation.isPending}
          onClear={clearBulkResults}
        />
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
      />

      {/* Upload Dialog */}
      <UploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onFileProcessed={handleFileUpload}
      />
    </div>
  );
}