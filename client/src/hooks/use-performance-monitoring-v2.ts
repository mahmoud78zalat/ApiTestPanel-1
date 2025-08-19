/**
 * Performance Monitoring Hook V2 - Complete Rewrite
 * 
 * This hook provides accurate performance tracking for API operations
 */

import { useState, useCallback, useRef } from "react";

interface PerformanceMetrics {
  totalRequests: number;
  completedRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  totalDataTransferred: number;
  cacheHitRate: number;
  startTime: number;
  endTime?: number;
  duplicateProfiles: number;
  profilesPerSecond: number;
  activeConnections: number;
}

export const usePerformanceMonitoringV2 = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalRequests: 0,
    completedRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    totalDataTransferred: 0,
    cacheHitRate: 0,
    startTime: Date.now(),
    duplicateProfiles: 0,
    profilesPerSecond: 0,
    activeConnections: 0
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const responseTimes = useRef<number[]>([]);
  const cacheStats = useRef({ hits: 0, misses: 0 });

  /**
   * Start monitoring performance with proper total count
   */
  const startMonitoring = useCallback((totalRequests: number) => {
    console.log('[Performance Monitor] Starting with total requests:', totalRequests);
    setIsMonitoring(true);
    const startTime = Date.now();
    
    setMetrics({
      totalRequests,
      completedRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalDataTransferred: 0,
      cacheHitRate: 0,
      startTime,
      duplicateProfiles: 0,
      profilesPerSecond: 0,
      activeConnections: 0
    });
    
    responseTimes.current = [];
    cacheStats.current = { hits: 0, misses: 0 };
  }, []);

  /**
   * Stop monitoring performance
   */
  const stopMonitoring = useCallback(() => {
    console.log('[Performance Monitor] Stopping monitoring');
    setIsMonitoring(false);
    setMetrics(prev => ({
      ...prev,
      endTime: Date.now()
    }));
  }, []);

  /**
   * Update metrics with bulk progress (replaces all metrics)
   */
  const updateBulkProgress = useCallback((bulkState: {
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    averageProcessingTime: number;
    activeConnections: number;
  }) => {
    console.log('[Performance Monitor] Bulk update:', bulkState);
    
    setMetrics(prev => {
      const now = Date.now();
      const elapsedTime = now - prev.startTime;
      const profilesPerSecond = elapsedTime > 0 && bulkState.processedItems > 0 ? 
        Math.round((bulkState.processedItems / (elapsedTime / 1000)) * 100) / 100 : 0;

      const totalCacheRequests = cacheStats.current.hits + cacheStats.current.misses;
      const cacheHitRate = totalCacheRequests > 0
        ? (cacheStats.current.hits / totalCacheRequests) * 100
        : 0;

      return {
        ...prev,
        totalRequests: bulkState.totalItems,
        completedRequests: bulkState.processedItems,
        successfulRequests: bulkState.successfulItems,
        failedRequests: bulkState.failedItems,
        averageResponseTime: bulkState.averageProcessingTime,
        activeConnections: bulkState.activeConnections,
        profilesPerSecond,
        cacheHitRate
      };
    });
  }, []);

  /**
   * Record individual request completion
   */
  const recordRequest = useCallback((
    success: boolean,
    responseTime: number,
    dataSize: number = 0,
    fromCache: boolean = false
  ) => {
    responseTimes.current.push(responseTime);
    
    // Keep response times bounded
    if (responseTimes.current.length > 500) {
      responseTimes.current = responseTimes.current.slice(-250);
    }
    
    if (fromCache) {
      cacheStats.current.hits++;
    } else {
      cacheStats.current.misses++;
    }

    setMetrics(prev => {
      const now = Date.now();
      const completedRequests = prev.completedRequests + 1;
      const successfulRequests = prev.successfulRequests + (success ? 1 : 0);
      const failedRequests = prev.failedRequests + (success ? 0 : 1);
      const totalDataTransferred = prev.totalDataTransferred + dataSize;
      
      const averageResponseTime = responseTimes.current.length > 0
        ? responseTimes.current.reduce((sum, time) => sum + time, 0) / responseTimes.current.length
        : 0;
      
      const totalCacheRequests = cacheStats.current.hits + cacheStats.current.misses;
      const cacheHitRate = totalCacheRequests > 0
        ? (cacheStats.current.hits / totalCacheRequests) * 100
        : 0;

      const elapsedTime = now - prev.startTime;
      const profilesPerSecond = elapsedTime > 0 ? 
        Math.round((completedRequests / (elapsedTime / 1000)) * 100) / 100 : 0;

      // Ensure totalRequests never goes below completed
      const adjustedTotalRequests = Math.max(prev.totalRequests, completedRequests);

      return {
        ...prev,
        totalRequests: adjustedTotalRequests,
        completedRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        totalDataTransferred,
        cacheHitRate,
        profilesPerSecond
      };
    });
  }, []);

  /**
   * Reset all metrics
   */
  const resetMetrics = useCallback(() => {
    console.log('[Performance Monitor] Resetting metrics');
    setMetrics({
      totalRequests: 0,
      completedRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      totalDataTransferred: 0,
      cacheHitRate: 0,
      startTime: Date.now(),
      duplicateProfiles: 0,
      profilesPerSecond: 0,
      activeConnections: 0
    });
    responseTimes.current = [];
    cacheStats.current = { hits: 0, misses: 0 };
    setIsMonitoring(false);
  }, []);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    recordRequest,
    updateBulkProgress,
    resetMetrics
  };
};