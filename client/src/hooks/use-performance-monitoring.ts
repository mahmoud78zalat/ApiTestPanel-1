/**
 * Performance Monitoring Hook
 * 
 * This hook tracks performance metrics for API operations
 */

import { useState, useCallback, useRef } from "react";
import { requestScheduler } from "@/services/request-scheduler";

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
  });

  const [isMonitoring, setIsMonitoring] = useState(false);
  const responseTimes = useRef<number[]>([]);
  const cacheStats = useRef({ hits: 0, misses: 0 });

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
   * Record a completed request
   */
  const recordRequest = useCallback((
    success: boolean,
    responseTime: number,
    dataSize: number = 0,
    fromCache: boolean = false
  ) => {
    responseTimes.current.push(responseTime);
    
    if (fromCache) {
      cacheStats.current.hits++;
    } else {
      cacheStats.current.misses++;
    }

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

      return {
        ...prev,
        completedRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        totalDataTransferred,
        cacheHitRate
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
    });
    responseTimes.current = [];
    cacheStats.current = { hits: 0, misses: 0 };
    setIsMonitoring(false);
  }, []);

  /**
   * Get cache statistics from request scheduler
   */
  const updateCacheStats = useCallback(() => {
    const stats = requestScheduler.getCacheStats();
    setMetrics(prev => ({
      ...prev,
      cacheHitRate: stats.size > 0 ? (cacheStats.current.hits / (cacheStats.current.hits + cacheStats.current.misses)) * 100 : 0
    }));
  }, []);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    recordRequest,
    resetMetrics,
    updateCacheStats
  };
};