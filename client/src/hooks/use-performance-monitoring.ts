/**
 * Performance Monitoring Hook
 * 
 * This hook tracks performance metrics for API operations
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

export const usePerformanceMonitoring = () => {
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
  const lastUpdateTime = useRef<number>(0);

  /**
   * Start monitoring performance
   */
  const startMonitoring = useCallback((totalRequests: number) => {
    setIsMonitoring(true);
    setMetrics({
      totalRequests,
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
  }, []);

  /**
   * Stop monitoring performance
   */
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    setMetrics(prev => ({
      ...prev,
      endTime: Date.now()
    }));
  }, []);

  /**
   * Update metrics directly with bulk progress data (throttled for performance)
   */
  const updateMetrics = useCallback((bulkState: {
    totalItems: number;
    processedItems: number;
    successfulItems: number;
    failedItems: number;
    averageProcessingTime: number;
    activeConnections: number;
  }) => {
    // Throttle updates to prevent UI freezing during high-volume operations
    const now = Date.now();
    if (now - lastUpdateTime.current < 250) { // Update at most every 250ms
      return;
    }
    lastUpdateTime.current = now;

    setMetrics(prev => ({
      ...prev,
      totalRequests: bulkState.totalItems,
      completedRequests: bulkState.processedItems,
      successfulRequests: bulkState.successfulItems,
      failedRequests: bulkState.failedItems,
      averageResponseTime: bulkState.averageProcessingTime,
      activeConnections: bulkState.activeConnections,
      profilesPerSecond: bulkState.processedItems > 0 && prev.startTime ? 
        bulkState.processedItems / ((now - prev.startTime) / 1000) : 0
    }));
  }, []);

  /**
   * Record a completed request (throttled for performance)
   */
  const recordRequest = useCallback((
    success: boolean,
    responseTime: number,
    dataSize: number = 0,
    fromCache: boolean = false
  ) => {
    // Always update internal counters
    responseTimes.current.push(responseTime);
    
    // Keep response times array bounded to prevent memory issues
    if (responseTimes.current.length > 1000) {
      responseTimes.current = responseTimes.current.slice(-500);
    }
    
    if (fromCache) {
      cacheStats.current.hits++;
    } else {
      cacheStats.current.misses++;
    }

    // Throttle UI updates for performance
    const now = Date.now();
    if (now - lastUpdateTime.current < 100) { // Update at most every 100ms for individual requests
      return;
    }
    lastUpdateTime.current = now;

    setMetrics(prev => {
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
      const profilesPerSecond = elapsedTime > 0 ? (completedRequests / (elapsedTime / 1000)) : 0;

      return {
        ...prev,
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

  /**
   * Update cache statistics manually
   */
  const updateCacheStats = useCallback(() => {
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: (cacheStats.current.hits + cacheStats.current.misses) > 0 
        ? (cacheStats.current.hits / (cacheStats.current.hits + cacheStats.current.misses)) * 100 
        : 0
    }));
  }, []);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    recordRequest,
    updateMetrics,
    resetMetrics,
    updateCacheStats
  };
};