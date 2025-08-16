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
   * Adds a new debug log entry
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

    setDebugLogs(prev => [logEntry, ...prev].slice(0, 50)); // Keep last 50 logs
    
    // Auto-open debug panel for new response/error logs
    if (type === 'response' || type === 'error') {
      setShowDebugPanel(true);
    }
  }, []);

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
    setShowDebugPanel
  };
};