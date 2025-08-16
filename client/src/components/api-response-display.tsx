/**
 * API Response Display Component
 * 
 * This component displays API response data in a formatted and readable manner
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "@/components/json-viewer";
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Database,
  Copy,
  FileText
} from "lucide-react";
import type { ApiResponse } from "@/types/api";
import { useState } from "react";

interface ApiResponseDisplayProps {
  /** API response data */
  response: ApiResponse | null;
  /** Error message if request failed */
  error: string | null;
  /** Whether request is currently loading */
  isLoading: boolean;
}

export function ApiResponseDisplay({ 
  response, 
  error, 
  isLoading 
}: ApiResponseDisplayProps) {
  const [copied, setCopied] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
            <h3 className="text-lg font-semibold">Processing Request...</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Sending request...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && !response) {
    return (
      <Card className="w-full mt-6 border-red-200">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Request Failed</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-red-800 font-medium mb-2">Error Details:</div>
            <div className="text-red-700 text-sm font-mono">{error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No response state
  if (!response) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-700">API Response</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No response yet</p>
            <p className="text-sm">Send a request to see the response data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state with response
  const isSuccess = response.status >= 200 && response.status < 300;
  const isClientError = response.status >= 400 && response.status < 500;
  const isServerError = response.status >= 500;

  const getStatusColor = () => {
    if (isSuccess) return "text-green-600";
    if (isClientError) return "text-yellow-600";
    if (isServerError) return "text-red-600";
    return "text-gray-600";
  };

  const getStatusIcon = () => {
    if (isSuccess) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (isClientError) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    if (isServerError) return <AlertTriangle className="w-5 h-5 text-red-600" />;
    return <Database className="w-5 h-5 text-gray-600" />;
  };

  const handleCopyResponse = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy response:', error);
    }
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <h3 className="text-lg font-semibold">API Response</h3>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyResponse}
              disabled={!response}
            >
              <Copy className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Response'}
            </Button>
          </div>
        </div>

        {/* Response Metadata */}
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant={isSuccess ? "default" : isClientError ? "secondary" : "destructive"}
            className={getStatusColor()}
          >
            {response.status} {response.statusText}
          </Badge>
          
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" />
            {response.responseTime}ms
          </Badge>
          
          <Badge variant="outline">
            <FileText className="w-3 h-3 mr-1" />
            {formatBytes(response.size)}
          </Badge>

          {/* Content Type Badge */}
          {response.headers['content-type'] && (
            <Badge variant="outline">
              {response.headers['content-type'].split(';')[0]}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Response Headers (if not empty) */}
        {Object.keys(response.headers).length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Response Headers</h4>
            <div className="bg-gray-50 border rounded-lg p-3 text-xs font-mono max-h-32 overflow-auto">
              {Object.entries(response.headers).map(([key, value]) => (
                <div key={key} className="mb-1">
                  <span className="text-blue-600">{key}:</span>{' '}
                  <span className="text-gray-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Response Body */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Response Body</h4>
          {typeof response.data === 'object' ? (
            <JsonViewer data={response.data} />
          ) : (
            <div className="bg-gray-50 border rounded-lg p-4 font-mono text-sm max-h-96 overflow-auto">
              {String(response.data)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Helper function to format bytes in human readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}