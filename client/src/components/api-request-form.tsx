/**
 * API Request Form Component
 * 
 * This component handles the main API request form including endpoint selection,
 * parameter input, and request configuration
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Play, Settings, RotateCcw, Plus, Square } from "lucide-react";

import { API_ENDPOINTS, DEFAULT_CONFIG, type ApiEndpoint } from "@/config/api-endpoints";
import { constructUrl } from "@/utils/url-utils";

interface ApiRequestFormProps {
  /** Current URL value */
  url: string;
  /** Current HTTP method */
  method: string;
  /** Current authentication token */
  token: string;
  /** Current selected endpoint ID */
  selectedEndpoint: string;
  /** Current endpoint parameters */
  parameters: Record<string, string>;
  /** Whether to show custom URL input */
  showCustomUrl: boolean;
  /** Bulk processing mode state */
  bulkMode: boolean;
  /** Bulk input text */
  bulkInput: string;
  /** Loading state */
  isLoading?: boolean;
  /** Bulk processing state */
  isProcessing?: boolean;
  
  /** Event handlers */
  onUrlChange: (url: string) => void;
  onMethodChange: (method: string) => void;
  onTokenChange: (token: string) => void;
  onEndpointChange: (endpointId: string) => void;
  onParametersChange: (params: Record<string, string>) => void;
  onShowCustomUrlToggle: (show: boolean) => void;
  onBulkModeToggle: (enabled: boolean) => void;
  onBulkInputChange: (input: string) => void;
  onSubmit: () => void;
  onReset: () => void;
}

export function ApiRequestForm({
  url,
  method,
  token,
  selectedEndpoint,
  parameters,
  showCustomUrl,
  bulkMode,
  bulkInput,
  isLoading = false,
  isProcessing = false,
  onUrlChange,
  onMethodChange,
  onTokenChange,
  onEndpointChange,
  onParametersChange,
  onShowCustomUrlToggle,
  onBulkModeToggle,
  onBulkInputChange,
  onSubmit,
  onReset
}: ApiRequestFormProps) {
  const [currentEndpoint, setCurrentEndpoint] = useState<ApiEndpoint | undefined>();

  // Update current endpoint when selection changes
  useEffect(() => {
    const endpoint = API_ENDPOINTS.find(ep => ep.id === selectedEndpoint);
    setCurrentEndpoint(endpoint);
    
    if (endpoint) {
      // Update method when endpoint changes
      onMethodChange(endpoint.method);
      
      // Update URL when endpoint changes (only if not using custom URL)
      if (!showCustomUrl) {
        const constructedUrl = constructUrl(endpoint.url, parameters);
        onUrlChange(constructedUrl);
        
        // Add debugging console log
        console.log("🔄 URL Updated:", constructedUrl);
        console.log("├─ Endpoint ID:", selectedEndpoint);
        console.log("├─ Template:", endpoint.url);
        console.log("└─ Parameters:", parameters);
      }
    }
  }, [selectedEndpoint, parameters, showCustomUrl, onMethodChange, onUrlChange]);

  // Handle parameter change
  const handleParameterChange = (key: string, value: string) => {
    const updatedParams = { ...parameters, [key]: value };
    onParametersChange(updatedParams);
  };

  // Reset form to defaults
  const handleReset = () => {
    onUrlChange(DEFAULT_CONFIG.DEFAULT_URL);
    onMethodChange("GET");
    onTokenChange(DEFAULT_CONFIG.DEFAULT_TOKEN);
    onEndpointChange("");
    onParametersChange({});
    onShowCustomUrlToggle(false); // Changed to false to match the hook default
    onBulkModeToggle(false);
    onBulkInputChange("");
    onReset();
  };

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold">API Request Configuration</h2>
          </div>
          
          {/* Bulk Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="bulk-mode" className="text-sm font-medium">
              Bulk Processing
            </Label>
            <Switch
              id="bulk-mode"
              checked={bulkMode}
              onCheckedChange={onBulkModeToggle}
            />
          </div>
        </div>

        {/* Endpoint Selection */}
        <div className="space-y-2">
          <Label htmlFor="endpoint-select">Select API Endpoint</Label>
          <Select value={selectedEndpoint} onValueChange={onEndpointChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a predefined endpoint..." />
            </SelectTrigger>
            <SelectContent>
              {API_ENDPOINTS.map((endpoint) => (
                <SelectItem key={endpoint.id} value={endpoint.id}>
                  <div>
                    <div className="font-medium">{endpoint.name}</div>
                    <div className="text-sm text-gray-500">{endpoint.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom URL Toggle */}
        <div className="flex items-center space-x-2">
          <Switch
            id="custom-url"
            checked={showCustomUrl}
            onCheckedChange={(checked) => {
              console.log("🔧 Custom URL toggle clicked:", checked);
              onShowCustomUrlToggle(checked);
            }}
          />
          <Label htmlFor="custom-url" className="text-sm">
            Use custom URL
          </Label>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* URL Input */}
        <div className="space-y-2">
          <Label htmlFor="url">Request URL</Label>
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="Enter API endpoint URL"
            disabled={!showCustomUrl && !!currentEndpoint}
            className="font-mono text-sm"
          />
        </div>

        {/* HTTP Method Selection */}
        <div className="space-y-2">
          <Label htmlFor="method">HTTP Method</Label>
          <Select value={method} onValueChange={onMethodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="HEAD">HEAD</SelectItem>
              <SelectItem value="OPTIONS">OPTIONS</SelectItem>
              <SelectItem value="TRACE">TRACE</SelectItem>
              <SelectItem value="CONNECT">CONNECT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Parameters Section */}
        {currentEndpoint && currentEndpoint.parameters.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Parameters</h3>
              
              {!bulkMode ? (
                // Single value inputs
                <div className="grid gap-4">
                  {currentEndpoint.parameters.map((param) => (
                    <div key={param.key} className="space-y-2">
                      <Label htmlFor={param.key}>
                        {param.label} {param.required && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id={param.key}
                        value={parameters[param.key] || ''}
                        onChange={(e) => handleParameterChange(param.key, e.target.value)}
                        placeholder={param.placeholder}
                        required={param.required}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                // Bulk input
                <div className="space-y-2">
                  <Label htmlFor="bulk-input">
                    Bulk {currentEndpoint.parameters[0]?.label || 'Values'} (one per line)
                  </Label>
                  <Textarea
                    id="bulk-input"
                    value={bulkInput}
                    onChange={(e) => onBulkInputChange(e.target.value)}
                    placeholder={`Enter multiple ${currentEndpoint.parameters[0]?.label.toLowerCase() || 'values'}, one per line:\n\nExample:\n1405941\n1932179\n2145863`}
                    rows={6}
                    className="font-mono text-sm"
                  />
                  {bulkInput && (
                    <div className="text-sm text-gray-600">
                      {bulkInput.split('\n').filter(line => line.trim()).length} values entered
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Authentication Token */}
        <div className="space-y-2">
          <Label htmlFor="token">Authentication Token</Label>
          <Textarea
            id="token"
            value={token}
            onChange={(e) => onTokenChange(e.target.value)}
            placeholder="Enter your JWT token here..."
            rows={4}
            className="font-mono text-xs"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-4">
          <Button 
            onClick={onSubmit} 
            disabled={(!bulkMode && (isLoading || (!url && !currentEndpoint))) || (bulkMode && !bulkInput.trim() && !isProcessing)}
            className={`flex-1 transition-all duration-300 ${bulkMode && isProcessing ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 shadow-lg transform scale-[1.02]' : ''}`}
            variant={bulkMode && isProcessing ? "destructive" : "default"}
          >
            {bulkMode && isProcessing ? (
              <>
                <Square className="w-4 h-4 mr-2 animate-pulse text-white" />
                Stop Processing
              </>
            ) : bulkMode ? (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Bulk Processing
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Send Request
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}