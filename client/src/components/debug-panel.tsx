/**
 * Debug Panel Component
 * 
 * This component displays debug logs and request/response information
 * for troubleshooting API requests
 */

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JsonViewer } from "@/components/json-viewer";
import { 
  Bug, 
  Trash2, 
  Eye, 
  ChevronDown, 
  ChevronRight,
  AlertTriangle,
  Info,
  CheckCircle,
  Send
} from "lucide-react";
import type { DebugLogEntry } from "@/types/api";
import { formatDate } from "@/utils/date-utils";

interface DebugPanelProps {
  /** Array of debug log entries */
  logs: DebugLogEntry[];
  /** Whether the debug panel is visible */
  isVisible: boolean;
  /** Callback to toggle panel visibility */
  onToggleVisibility: () => void;
  /** Callback to clear all logs */
  onClearLogs: () => void;
}

export function DebugPanel({ 
  logs, 
  isVisible, 
  onToggleVisibility, 
  onClearLogs 
}: DebugPanelProps) {
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const toggleLogExpansion = (index: number) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLogs(newExpanded);
  };

  const getLogTypeIcon = (type: DebugLogEntry['type']) => {
    switch (type) {
      case 'request':
        return <Send className="w-4 h-4 text-blue-600" />;
      case 'response':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'info':
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getLogTypeBadgeVariant = (type: DebugLogEntry['type']) => {
    switch (type) {
      case 'request':
        return 'default';
      case 'response':
        return 'secondary';
      case 'error':
        return 'destructive';
      case 'info':
        return 'outline';
    }
  };

  if (!isVisible) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bug className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Debug Console</h3>
              {logs.length > 0 && (
                <Badge variant="outline">{logs.length} logs</Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={onToggleVisibility}>
              <ChevronDown className="w-4 h-4 mr-2" />
              Show Debug Panel
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bug className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Debug Console</h3>
            {logs.length > 0 && (
              <Badge variant="outline">{logs.length} logs</Badge>
            )}
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClearLogs}
              disabled={logs.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Logs
            </Button>
            <Button variant="outline" size="sm" onClick={onToggleVisibility}>
              <ChevronRight className="w-4 h-4 mr-2" />
              Hide
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bug className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No debug logs yet</p>
            <p className="text-sm">Make an API request to see debug information</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3 bg-gray-50"
              >
                {/* Log Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleLogExpansion(index)}
                >
                  <div className="flex items-center space-x-3">
                    {getLogTypeIcon(log.type)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{log.title}</span>
                        <Badge variant={getLogTypeBadgeVariant(log.type)}>
                          {log.type}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(log.timestamp, 'long')} • {new Date(log.timestamp).toLocaleTimeString()}
                        {log.method && log.url && (
                          <> • {log.method} {log.url}</>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {expandedLogs.has(index) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>

                {/* Expanded Log Content */}
                {expandedLogs.has(index) && (
                  <div className="mt-3 border-t pt-3">
                    {typeof log.data === 'object' ? (
                      <JsonViewer data={log.data} className="max-h-64" />
                    ) : (
                      <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-32">
                        {String(log.data)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}