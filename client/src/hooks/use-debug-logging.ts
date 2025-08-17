/**
 * Debug Logging Hook
 * 
 * This hook manages debug logging state and provides utilities for adding debug entries
 */

import { useState, useCallback } from "react";
import type { DebugLogEntry } from "@/types/api";
import { getCurrentTimestamp } from "@/utils/date-utils";

export const useDebugLogging = () => {
  const [debugLogs, setDebugLogs] = useState<DebugLogEntry[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  /**
   * Adds a new debug log entry with enhanced process tracking
   */
  const addDebugLog = useCallback((
    type: DebugLogEntry['type'],
    title: string,
    data: any,
    url?: string,
    method?: string
  ) => {
    const logEntry: DebugLogEntry = {
      timestamp: getCurrentTimestamp(),
      type,
      title,
      data,
      url,
      method,
    };

    setDebugLogs(prev => [logEntry, ...prev].slice(0, 100)); // Keep last 100 logs for detailed tracking
    
    // Auto-open debug panel for new response/error logs
    if (type === 'response' || type === 'error') {
      setShowDebugPanel(true);
    }
  }, []);

  /**
   * Enhanced logging for process steps with detailed information
   */
  const logProcessStep = useCallback((
    stepNumber: number,
    stepName: string,
    details: any,
    status: 'started' | 'progress' | 'completed' | 'failed' = 'progress'
  ) => {
    const stepTitle = `Step ${stepNumber}: ${stepName}`;
    const statusIcon = {
      started: '🚀',
      progress: '⚡',
      completed: '✅',
      failed: '❌'
    }[status];

    addDebugLog('info', `${statusIcon} ${stepTitle}`, {
      stepNumber,
      stepName,
      status,
      details,
      timestamp: getCurrentTimestamp()
    });
  }, [addDebugLog]);

  /**
   * Log API request with full details
   */
  const logApiRequest = useCallback((
    url: string,
    method: string,
    details: {
      customerId?: string;
      endpoint?: string;
      token?: boolean;
      headers?: any;
      params?: any;
    }
  ) => {
    addDebugLog('request', `🌐 API Request: ${method} ${url.split('/').pop()}`, {
      url,
      method,
      ...details,
      startTime: Date.now()
    });
  }, [addDebugLog]);

  /**
   * Log API response with performance metrics
   */
  const logApiResponse = useCallback((
    url: string,
    responseData: {
      status: number;
      responseTime: number;
      dataSize: number;
      isSuccess: boolean;
      errorMessage?: string;
      data?: any;
    }
  ) => {
    const title = responseData.isSuccess 
      ? `✅ API Success: ${responseData.status}` 
      : `❌ API Failed: ${responseData.status}`;

    addDebugLog(responseData.isSuccess ? 'response' : 'error', title, {
      url,
      ...responseData,
      endTime: Date.now()
    });
  }, [addDebugLog]);

  /**
   * Log duplicate detection events
   */
  const logDuplicateDetection = useCallback((
    customerId: string,
    action: 'detected' | 'updated' | 'skipped'
  ) => {
    const actionText = {
      detected: '🔍 Duplicate Detected',
      updated: '🔄 Profile Updated',
      skipped: '⏭️ Duplicate Skipped'
    }[action];

    addDebugLog('info', `${actionText}: Customer ${customerId}`, {
      customerId,
      action,
      timestamp: getCurrentTimestamp()
    });
  }, [addDebugLog]);

  /**
   * Clears all debug logs
   */
  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  /**
   * Toggles debug panel visibility
   */
  const toggleDebugPanel = useCallback(() => {
    setShowDebugPanel(prev => !prev);
  }, []);

  return {
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
  };
};