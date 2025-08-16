/**
 * Bulk Results Panel Component
 * 
 * This component displays the results of bulk processing operations
 * with detailed status information and individual response data
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JsonViewer } from "@/components/json-viewer";
import { Trash2, Eye, CheckCircle, AlertTriangle, Clock, BarChart3 } from "lucide-react";
import type { BulkProcessingResult } from "@/types/api";

interface BulkResultsPanelProps {
  /** Array of bulk processing results */
  results: BulkProcessingResult[];
  /** Whether bulk processing is currently running */
  isProcessing: boolean;
  /** Callback to clear all results */
  onClear: () => void;
}

export function BulkResultsPanel({ 
  results, 
  isProcessing, 
  onClear 
}: BulkResultsPanelProps) {
  if (results.length === 0) return null;

  // Calculate summary statistics
  const total = results.length;
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  const pending = results.filter(r => r.status === 'pending').length;

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Bulk Processing Results</h3>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={isProcessing}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Results
          </Button>
        </div>

        {/* Summary Statistics */}
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="flex items-center space-x-1">
            <span>Total: {total}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1 text-green-700 bg-green-50">
            <CheckCircle className="w-3 h-3" />
            <span>Success: {successful}</span>
          </Badge>
          <Badge variant="outline" className="flex items-center space-x-1 text-red-700 bg-red-50">
            <AlertTriangle className="w-3 h-3" />
            <span>Failed: {failed}</span>
          </Badge>
          {pending > 0 && (
            <Badge variant="outline" className="flex items-center space-x-1 text-yellow-700 bg-yellow-50">
              <Clock className="w-3 h-3" />
              <span>Pending: {pending}</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Results Grid */}
        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 border rounded-lg transition-all ${
                result.status === 'success' 
                  ? 'border-green-200 bg-green-50' 
                  : result.status === 'error'
                  ? 'border-red-200 bg-red-50'
                  : 'border-yellow-200 bg-yellow-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Status Icon */}
                  {result.status === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                  {result.status === 'error' && (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  {result.status === 'pending' && (
                    <Clock className="w-5 h-5 text-yellow-600 animate-pulse" />
                  )}

                  <div>
                    <div className="font-medium">{result.value}</div>
                    {result.status === 'success' && result.response && (
                      <div className="text-sm text-gray-600">
                        Status: {result.response.status} • 
                        Response Time: {result.response.responseTime}ms
                      </div>
                    )}
                    {result.status === 'error' && result.error && (
                      <div className="text-sm text-red-600">
                        Error: {result.error}
                      </div>
                    )}
                    {result.status === 'pending' && (
                      <div className="text-sm text-yellow-600">
                        Processing...
                      </div>
                    )}
                  </div>
                </div>

                {/* View Response Button */}
                {result.status === 'success' && result.response && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        View Response
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                      <DialogHeader>
                        <DialogTitle>Response for {result.value}</DialogTitle>
                      </DialogHeader>
                      <div className="overflow-auto">
                        <JsonViewer data={result.response.data} />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Processing Progress */}
        {isProcessing && pending > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="text-sm font-medium text-blue-800">
                Processing... {total - pending} of {total} completed
              </span>
            </div>
            <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((total - pending) / total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}