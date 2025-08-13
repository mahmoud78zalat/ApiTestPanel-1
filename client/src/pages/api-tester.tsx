import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { JsonViewer } from "@/components/json-viewer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiRequest, ApiResponse } from "@shared/schema";
import {
  Play,
  Settings,
  Code,
  Clock,
  FileText,
  Info,
  Database,
  Copy,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Link,
  Key,
} from "lucide-react";

export default function ApiTester() {
  const { toast } = useToast();
  const [url, setUrl] = useState("https://api.brandsforlessuae.com/customer/api/v1/address?customerId=1932179");
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE" | "PATCH">("GET");
  const [token, setToken] = useState("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InVzZXJJZCI6MTQwMiwibmFtZSI6IkNhcm9saW5lIFdhZ3VpaCBGcmFuY2lzIiwiYXBwTmFtZSI6ImFkbWlucGFuZWwiLCJkYXRhc2VudGVyIjoidWFlIn0sImlhdCI6MTc1NTAxODA3NywiZXhwIjoxNzg2NTU0MDc3fQ.H4rQyaqsZ30hdooK9P8ropw2zea9bDstReZLuBeeK0g");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const proxyMutation = useMutation({
    mutationFn: async (request: ApiRequest) => {
      const res = await apiRequest("POST", "/api/proxy", request);
      return res.json();
    },
    onSuccess: (data: ApiResponse) => {
      setResponse(data);
      setError(null);
      toast({
        title: "Request completed successfully!",
        description: `Status: ${data.status} - ${data.responseTime}ms`,
      });
    },
    onError: (error: any) => {
      setError(error.message || "Request failed");
      setResponse(null);
      toast({
        title: "Request failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const handleExecute = () => {
    if (!url.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter an API endpoint URL",
        variant: "destructive",
      });
      return;
    }

    if (!token.trim()) {
      toast({
        title: "Missing Token",
        description: "Please enter an access token",
        variant: "destructive",
      });
      return;
    }

    const request: ApiRequest = {
      url: url.trim(),
      method,
      token: token.trim(),
    };

    proxyMutation.mutate(request);
  };

  const handleClear = () => {
    setResponse(null);
    setError(null);
  };

  const handleCopyResponse = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
      toast({
        title: "Copied!",
        description: "Response copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy response to clipboard",
        variant: "destructive",
      });
    }
  };

  const generateCurlCommand = () => {
    if (!url.trim()) return '';
    
    const curlParts = [
      'curl',
      '-X', method,
      `"${url.trim()}"`
    ];

    // Add headers
    curlParts.push('-H', '"accept: application/json, text/plain, */*"');
    curlParts.push('-H', '"origin: https://new-panel.brandsforlessuae.com"');
    curlParts.push('-H', '"referer: https://new-panel.brandsforlessuae.com/"');
    curlParts.push('-H', '"user-agent: Mozilla/5.0 (compatible; API-Tester/1.0)"');
    
    if (token.trim()) {
      curlParts.push('-H', `"x-access-token: ${token.trim()}"`);
    }

    return curlParts.join(' \\\n  ');
  };

  const handleCopyCurl = async () => {
    const curlCommand = generateCurlCommand();
    if (!curlCommand) {
      toast({
        title: "Cannot generate cURL",
        description: "Please enter an API endpoint URL first",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(curlCommand);
      toast({
        title: "cURL Copied!",
        description: "cURL command copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy cURL command to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const countDataItems = (obj: any): number => {
    if (Array.isArray(obj)) return obj.length;
    if (typeof obj === 'object' && obj !== null) return Object.keys(obj).length;
    return 1;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
                <Code className="text-white w-4 h-4" />
              </div>
              <h1 className="text-xl font-semibold text-slate-900">API Testing Panel</h1>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                Brands for Less
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">Environment: Production</span>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Request Configuration Panel */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              <CardHeader className="bg-slate-50 border-b">
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-slate-900">Request Configuration</h2>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* API Endpoint */}
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm font-medium text-slate-700">
                    API Endpoint URL
                  </Label>
                  <div className="relative">
                    <Input
                      id="url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://api.brandsforlessuae.com/..."
                      className="font-mono text-sm pr-10"
                    />
                    <Link className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* Access Token */}
                <div className="space-y-2">
                  <Label htmlFor="token" className="text-sm font-medium text-slate-700">
                    X-Access-Token
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Enter your access token here..."
                      className="font-mono text-sm resize-none min-h-[80px] pr-10"
                    />
                    <Key className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                {/* HTTP Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">HTTP Method</Label>
                  <Select value={method} onValueChange={(value: any) => setMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Execute Button */}
                <Button
                  onClick={handleExecute}
                  disabled={proxyMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                  size="lg"
                >
                  {proxyMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Execute Request
                    </>
                  )}
                </Button>

                {/* Quick Actions */}
                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={handleCopyCurl}
                      variant="ghost"
                      className="w-full justify-start text-slate-600 hover:bg-slate-50"
                      size="sm"
                    >
                      <Copy className="w-4 h-4 mr-2 text-slate-400" />
                      Copy cURL Command
                    </Button>
                    <Button
                      onClick={handleClear}
                      variant="ghost"
                      className="w-full justify-start text-slate-600 hover:bg-slate-50"
                      size="sm"
                    >
                      <RotateCcw className="w-4 h-4 mr-2 text-slate-400" />
                      Clear Response
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Response Display Panel */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              {/* Response Header */}
              <CardHeader className="bg-slate-50 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Code className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-slate-900">API Response</h2>
                    {response && (
                      <Badge
                        variant={response.status >= 200 && response.status < 300 ? "default" : "destructive"}
                        className={response.status >= 200 && response.status < 300 ? "bg-green-100 text-green-800" : ""}
                      >
                        {response.status >= 200 && response.status < 300 ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 mr-1" />
                        )}
                        {response.status} {response.statusText}
                      </Badge>
                    )}
                    {error && (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Error
                      </Badge>
                    )}
                  </div>
                  {response && (
                    <Button
                      onClick={handleCopyResponse}
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:bg-blue-50"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Response Content */}
              <CardContent className="p-6">
                {!response && !error && !proxyMutation.isPending && (
                  <div className="min-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Play className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-lg font-medium mb-2">Ready to Execute</p>
                      <p className="text-slate-400 text-sm">Configure your request and click "Execute Request" to see the API response</p>
                    </div>
                  </div>
                )}

                {proxyMutation.isPending && (
                  <div className="min-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-600 font-medium">Executing request...</p>
                    </div>
                  </div>
                )}

                {response && (
                  <div>
                    <JsonViewer data={response.data} />
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                      <div className="flex-1">
                        <h3 className="text-red-800 font-semibold mb-2">Request Failed</h3>
                        <p className="text-red-700 text-sm mb-3">{error}</p>
                        <div className="bg-red-100 rounded p-3">
                          <pre className="text-red-800 text-xs font-mono whitespace-pre-wrap overflow-auto">
                            {error}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Request Stats */}
            {response && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Response Time</p>
                        <p className="text-lg font-semibold text-slate-900">{response.responseTime}ms</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <FileText className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Response Size</p>
                        <p className="text-lg font-semibold text-slate-900">{formatBytes(response.size)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                        <Info className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Status Code</p>
                        <p className="text-lg font-semibold text-slate-900">{response.status}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                        <Database className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Data Count</p>
                        <p className="text-lg font-semibold text-slate-900">{countDataItems(response.data).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
