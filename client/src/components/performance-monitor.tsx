/**
 * Performance Monitor Component
 * 
 * This component tracks and displays performance metrics for API operations
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Zap, 
  Clock, 
  Database,
  TrendingUp,
  Eye,
  EyeOff
} from "lucide-react";

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

interface PerformanceMonitorProps {
  /** Current performance metrics */
  metrics: PerformanceMetrics;
  /** Whether monitoring is active */
  isActive: boolean;
  /** Callback to reset metrics */
  onReset: () => void;
  /** Whether to show detailed metrics */
  showDetails?: boolean;
  /** Number of duplicate profiles detected */
  duplicateCount?: number;
}

export function PerformanceMonitor({
  metrics,
  isActive,
  onReset,
  showDetails = false,
  duplicateCount = 0
}: PerformanceMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time (less frequently for performance)
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - metrics.startTime;
      setElapsedTime(elapsed);
    }, 500); // Update every 500ms instead of 100ms for better performance

    return () => clearInterval(interval);
  }, [isActive, metrics.startTime]);

  // Calculate derived metrics with debugging
  const completionPercentage = metrics.totalRequests > 0 
    ? (metrics.completedRequests / metrics.totalRequests) * 100 
    : 0;
    
  // Log for debugging progress issues
  useEffect(() => {
    if (isActive) {
      console.log('[Performance Monitor Display] Metrics updated:', {
        totalRequests: metrics.totalRequests,
        completedRequests: metrics.completedRequests,
        ratio: `${metrics.completedRequests}/${metrics.totalRequests}`,
        percentage: completionPercentage
      });
    }
  }, [metrics.totalRequests, metrics.completedRequests, completionPercentage, isActive]);

  const successRate = metrics.completedRequests > 0 
    ? (metrics.successfulRequests / metrics.completedRequests) * 100 
    : 0;

  const requestsPerSecond = metrics.profilesPerSecond > 0 
    ? metrics.profilesPerSecond 
    : (elapsedTime > 0 ? (metrics.completedRequests / (elapsedTime / 1000)) : 0);

  const estimatedTimeRemaining = requestsPerSecond > 0 && metrics.totalRequests > metrics.completedRequests
    ? ((metrics.totalRequests - metrics.completedRequests) / requestsPerSecond) * 1000
    : 0;

  const formatBytes = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  if (!isActive && metrics.totalRequests === 0) {
    return null;
  }

  return (
    <Card className="w-full mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium">Performance Monitor</h4>
            {isActive && (
              <Badge variant="outline" className="animate-pulse">
                <Zap className="w-3 h-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </Button>
            <Button variant="outline" size="sm" onClick={onReset}>
              Reset
            </Button>
          </div>
        </div>

        {/* Primary Metrics */}
        <div className="space-y-3">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress: {metrics.completedRequests} / {metrics.totalRequests}</span>
              <span>{completionPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {successRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Success Rate</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">
                {duplicateCount}
              </div>
              <div className="text-xs text-gray-500">Duplicates</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {requestsPerSecond.toFixed(1)}/s
              </div>
              <div className="text-xs text-gray-500">Requests/sec</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">
                {metrics.averageResponseTime.toFixed(0)}ms
              </div>
              <div className="text-xs text-gray-500">Avg Response</div>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">
                {formatTime(isActive ? elapsedTime : (metrics.endTime || Date.now()) - metrics.startTime)}
              </div>
              <div className="text-xs text-gray-500">Elapsed Time</div>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Detailed Metrics */}
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Request Statistics */}
            <div>
              <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Request Statistics
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Requests:</span>
                  <span className="font-mono">{metrics.totalRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed:</span>
                  <span className="font-mono">{metrics.completedRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Successful:</span>
                  <span className="font-mono text-green-600">{metrics.successfulRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed:</span>
                  <span className="font-mono text-red-600">{metrics.failedRequests}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending:</span>
                  <span className="font-mono text-yellow-600">
                    {metrics.totalRequests - metrics.completedRequests}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Statistics */}
            <div>
              <h5 className="font-medium text-gray-700 mb-3 flex items-center">
                <Database className="w-4 h-4 mr-2" />
                Performance Statistics
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Requests/Second:</span>
                  <span className="font-mono">{requestsPerSecond.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cache Hit Rate:</span>
                  <span className="font-mono">{metrics.cacheHitRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Data Transferred:</span>
                  <span className="font-mono">{formatBytes(metrics.totalDataTransferred)}</span>
                </div>
                {estimatedTimeRemaining > 0 && (
                  <div className="flex justify-between">
                    <span>Est. Time Remaining:</span>
                    <span className="font-mono">{formatTime(estimatedTimeRemaining)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h6 className="text-sm font-medium text-blue-900 mb-2">Performance Insights</h6>
            <div className="space-y-1 text-xs text-blue-800">
              {requestsPerSecond > 5 && (
                <div>🚀 Excellent throughput - processing over 5 requests per second</div>
              )}
              {metrics.cacheHitRate > 30 && (
                <div>💾 Good cache utilization - {metrics.cacheHitRate.toFixed(0)}% hit rate reducing API load</div>
              )}
              {successRate > 95 && (
                <div>✅ High reliability - {successRate.toFixed(1)}% success rate</div>
              )}
              {metrics.averageResponseTime < 500 && (
                <div>⚡ Fast responses - average {metrics.averageResponseTime.toFixed(0)}ms response time</div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}