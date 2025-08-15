import { useState, useEffect } from "react";
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
  List,
  Search,
  Layers,
  BarChart3,
} from "lucide-react";

// Predefined API endpoints with dynamic parameters
interface ApiEndpoint {
  id: string;
  name: string;
  description: string;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | "TRACE" | "CONNECT";
  parameters: Array<{
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
  }>;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  {
    id: "fetch-order",
    name: "Fetch Order by ID",
    description: "Fetch order for specific user",
    url: "https://api.brandsforlessuae.com/shipment/api/v1/shipment/order/{orderid}",
    method: "GET",
    parameters: [
      {
        key: "orderid",
        label: "Order ID",
        placeholder: "Enter order ID (e.g., 1932179)",
        required: true
      }
    ]
  },
  {
    id: "sales-return",
    name: "Sales Return Check",
    description: "Check for user returned items and refund",
    url: "https://api.brandsforlessuae.com/shipment/api/v1/shipment/salesReturn/customer/{customerid}",
    method: "GET",
    parameters: [
      {
        key: "customerid",
        label: "Customer ID",
        placeholder: "Enter customer ID (e.g., 1405941)",
        required: true
      }
    ]
  },
  {
    id: "customer-orders",
    name: "Customer Orders",
    description: "Search for all orders for specific user",
    url: "https://api.brandsforlessuae.com/shipment/api/v1/shipment/order?customerId={customerid}&pageNum=1&pageSize=20",
    method: "GET",
    parameters: [
      {
        key: "customerid",
        label: "Customer ID",
        placeholder: "Enter customer ID (e.g., 1405941)",
        required: true
      }
    ]
  },
  {
    id: "search-by-email",
    name: "Search by Email",
    description: "Search customer by email address",
    url: "https://api.brandsforlessuae.com/customer/api/v1/user?mobile=&email={email}&customerId=",
    method: "GET",
    parameters: [
      {
        key: "email",
        label: "Email Address",
        placeholder: "Enter email address (e.g., user@example.com)",
        required: true
      }
    ]
  },
  {
    id: "search-by-phone",
    name: "Search by Phone",
    description: "Search customer by phone number",
    url: "https://api.brandsforlessuae.com/customer/api/v1/user?mobile={phonenum}&email=&customerId=-1",
    method: "GET",
    parameters: [
      {
        key: "phonenum",
        label: "Phone Number",
        placeholder: "Enter phone number (e.g., +971501234567)",
        required: true
      }
    ]
  },
  {
    id: "customer-address",
    name: "Customer Address Info",
    description: "Fetch user information including name, address, phone, email",
    url: "https://api.brandsforlessuae.com/customer/api/v1/address?customerId={customerid}",
    method: "GET",
    parameters: [
      {
        key: "customerid",
        label: "Customer ID",
        placeholder: "Enter customer ID (e.g., 1932179)",
        required: true
      }
    ]
  },
  {
    id: "fetch-sms",
    name: "Fetch User SMS Messages",
    description: "Fetches users SMS messages",
    url: "https://api.brandsforlessuae.com/customer/api/v1/sms?customerId=-1&mobile={phonenumber}&index=1&pageSize=10",
    method: "GET",
    parameters: [
      {
        key: "phonenumber",
        label: "Phone Number",
        placeholder: "Enter phone number (e.g., +971501234567)",
        required: true
      }
    ]
  },
  {
    id: "fetch-email",
    name: "Fetch User Email Messages",
    description: "Fetches users email messages",
    url: "https://api.brandsforlessuae.com/customer/api/v1/email?customerId=-1&email={email}&index=1&pageSize=10",
    method: "GET",
    parameters: [
      {
        key: "email",
        label: "Email Address",
        placeholder: "Enter email address (e.g., user@example.com)",
        required: true
      }
    ]
  },
  {
    id: "cancel-order",
    name: "Cancel User Order",
    description: "Cancels users orders (two-step process: fetch order details then cancel)",
    url: "https://api.brandsforlessuae.com/shipment/api/v1/cancel/order",
    method: "POST",
    parameters: [
      {
        key: "orderid",
        label: "Order ID",
        placeholder: "Enter order ID (e.g., A235841600001-1)",
        required: true
      }
    ]
  }
];

export default function ApiTester() {
  const { toast } = useToast();
  const [url, setUrl] = useState("https://api.brandsforlessuae.com/customer/api/v1/address?customerId=1932179");
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | "TRACE" | "CONNECT">("GET");
  const [token, setToken] = useState("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InVzZXJJZCI6MTQwMiwibmFtZSI6IkNhcm9saW5lIFdhZ3VpaCBGcmFuY2lzIiwiYXBwTmFtZSI6ImFkbWlucGFuZWwiLCJkYXRhc2VudGVyIjoidWFlIn0sImlhdCI6MTc1NTAxODA3NywiZXhwIjoxNzg2NTU0MDc3fQ.H4rQyaqsZ30hdooK9P8ropw2zea9bDstReZLuBeeK0g");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("");
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [showCustomUrl, setShowCustomUrl] = useState(true);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [bulkResults, setBulkResults] = useState<Array<{
    value: string;
    status: 'success' | 'error' | 'pending';
    response?: ApiResponse;
    error?: string;
  }>>([]);

  // Helper function to construct URL from template and parameters
  const constructUrl = (templateUrl: string, params: Record<string, string>) => {
    let constructedUrl = templateUrl;
    Object.entries(params).forEach(([key, value]) => {
      constructedUrl = constructedUrl.replace(`{${key}}`, encodeURIComponent(value));
    });
    return constructedUrl;
  };

  // Helper function to calculate customerId from orderId
  const calculateCustomerId = (orderId: string): number => {
    // Remove dash and everything after it (e.g. A235841600001-1 -> A235841600001)
    let cleanOrderId = orderId.split('-')[0];
    
    // Remove the first letter if present (e.g. A235841600001 -> 235841600001)
    cleanOrderId = cleanOrderId.replace(/^[A-Za-z]/, '');
    
    // Remove first digit and last 5 digits
    // Example: 235841600001 -> remove first digit (2) -> 35841600001 -> remove last 5 digits -> 358416
    if (cleanOrderId.length > 6) {
      const withoutFirst = cleanOrderId.substring(1);
      const customerId = withoutFirst.substring(0, withoutFirst.length - 5);
      return parseInt(customerId, 10);
    }
    
    // Fallback if orderId format is unexpected
    return parseInt(cleanOrderId, 10) || 0;
  };

  // Handle endpoint selection
  const handleEndpointSelect = (endpointId: string) => {
    if (endpointId === "custom") {
      setSelectedEndpoint("");
      setShowCustomUrl(true);
      setParameters({});
      return;
    }

    const endpoint = API_ENDPOINTS.find(ep => ep.id === endpointId);
    if (endpoint) {
      setSelectedEndpoint(endpointId);
      setMethod(endpoint.method);
      setShowCustomUrl(false);
      
      // Initialize parameters
      const initialParams: Record<string, string> = {};
      endpoint.parameters.forEach(param => {
        initialParams[param.key] = "";
      });
      setParameters(initialParams);
      
      // Set URL template
      setUrl(endpoint.url);
    }
  };

  // Update URL when parameters change
  useEffect(() => {
    if (selectedEndpoint) {
      const endpoint = API_ENDPOINTS.find(ep => ep.id === selectedEndpoint);
      if (endpoint) {
        const constructedUrl = constructUrl(endpoint.url, parameters);
        setUrl(constructedUrl);
      }
    }
  }, [selectedEndpoint, parameters]);

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

  // Bulk processing function
  const processBulkRequests = async () => {
    if (!bulkInput.trim()) {
      toast({
        title: "No bulk data",
        description: "Please enter values to process in bulk mode",
        variant: "destructive",
      });
      return;
    }

    const values = bulkInput.split('\n').filter(v => v.trim()).map(v => v.trim());
    if (values.length === 0) {
      toast({
        title: "No valid values",
        description: "Please enter valid values separated by new lines",
        variant: "destructive",
      });
      return;
    }

    // Initialize results
    const initialResults = values.map(value => ({
      value,
      status: 'pending' as const,
    }));
    setBulkResults(initialResults);

    let successCount = 0;
    let errorCount = 0;

    // Process each value
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      
      try {
        // Special handling for cancel-order in bulk mode
        if (selectedEndpoint === "cancel-order") {
          // Step 1: Get order details
          const getOrderRequest: ApiRequest = {
            url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order/${value}`,
            method: "GET",
            token: token.trim(),
          };

          const getOrderRes = await apiRequest("POST", "/api/proxy", getOrderRequest);
          const getOrderData = await getOrderRes.json();
          
          if (!getOrderData.success) {
            throw new Error(getOrderData.error || "Failed to fetch order details");
          }

          const orderDetails = getOrderData.data;
          const currencyCode = orderDetails.currencyCode;
          
          if (!currencyCode) {
            throw new Error("Currency code not found in order details");
          }

          // Step 2: Calculate customerId
          const customerId = calculateCustomerId(value);

          // Step 3: Cancel the order
          const cancelPayload = {
            action: "CANCEL",
            assignee: 92,
            cancelItems: [],
            cancelType: "CUSTOMER_CANCELLATION", 
            comment: "",
            createdBy: 1402,
            currencyCode: currencyCode,
            customerId: customerId,
            orderId: value,
            reason: "Ordered By Mistake",
            reasonId: 8,
            refundMode: "RETURN_TO_SOURCE",
            source: "CS",
            status: 0
          };

          const cancelRequest: ApiRequest = {
            url: "https://api.brandsforlessuae.com/shipment/api/v1/cancel/order",
            method: "POST",
            token: token.trim(),
            body: JSON.stringify(cancelPayload),
            headers: {
              "Content-Type": "application/json"
            }
          };

          const res = await apiRequest("POST", "/api/proxy", cancelRequest);
          const data = await res.json();
          
          setBulkResults(prev => prev.map((result, index) => 
            index === i ? { ...result, status: 'success', response: data } : result
          ));
          successCount++;
          
        } else {
          // Regular processing for other endpoints
          let requestUrl = url;
          if (selectedEndpoint) {
            const endpoint = API_ENDPOINTS.find(ep => ep.id === selectedEndpoint);
            if (endpoint && endpoint.parameters.length > 0) {
              const firstParam = endpoint.parameters[0];
              const updatedParams = { ...parameters, [firstParam.key]: value };
              requestUrl = constructUrl(endpoint.url, updatedParams);
            }
          } else {
            // For custom URLs, try to replace common patterns
            requestUrl = url.replace(/\{[^}]+\}/, encodeURIComponent(value));
          }

          const request: ApiRequest = {
            url: requestUrl,
            method,
            token: token.trim(),
          };

          const res = await apiRequest("POST", "/api/proxy", request);
          const data = await res.json();
          
          setBulkResults(prev => prev.map((result, index) => 
            index === i ? { ...result, status: 'success', response: data } : result
          ));
          successCount++;
        }
        
      } catch (error: any) {
        setBulkResults(prev => prev.map((result, index) => 
          index === i ? { ...result, status: 'error', error: error.message } : result
        ));
        errorCount++;
      }
      
      // Small delay to prevent overwhelming the API
      if (i < values.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    toast({
      title: "Bulk processing completed",
      description: `${successCount} succeeded, ${errorCount} failed out of ${values.length} requests`,
    });
  };

  // Special handling for cancel order endpoint
  const handleCancelOrder = async (orderId: string) => {
    try {
      // Step 1: Get order details
      const getOrderRequest: ApiRequest = {
        url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order/${orderId}`,
        method: "GET",
        token: token.trim(),
      };

      const getOrderRes = await apiRequest("POST", "/api/proxy", getOrderRequest);
      const getOrderData = await getOrderRes.json();
      
      if (!getOrderData.success) {
        throw new Error(getOrderData.error || "Failed to fetch order details");
      }

      const orderDetails = getOrderData.data;
      const currencyCode = orderDetails.currencyCode;
      
      if (!currencyCode) {
        throw new Error("Currency code not found in order details");
      }

      // Step 2: Calculate customerId
      const customerId = calculateCustomerId(orderId);

      // Step 3: Cancel the order
      const cancelPayload = {
        action: "CANCEL",
        assignee: 92,
        cancelItems: [],
        cancelType: "CUSTOMER_CANCELLATION", 
        comment: "",
        createdBy: 1402,
        currencyCode: currencyCode,
        customerId: customerId,
        orderId: orderId,
        reason: "Ordered By Mistake",
        reasonId: 8,
        refundMode: "RETURN_TO_SOURCE",
        source: "CS",
        status: 0
      };

      const cancelRequest: ApiRequest = {
        url: "https://api.brandsforlessuae.com/shipment/api/v1/cancel/order",
        method: "POST",
        token: token.trim(),
        body: JSON.stringify(cancelPayload),
        headers: {
          "Content-Type": "application/json"
        }
      };

      const cancelRes = await apiRequest("POST", "/api/proxy", cancelRequest);
      const cancelData = await cancelRes.json();
      
      setResponse(cancelData);
      setError(null);
      toast({
        title: "Order cancellation completed!",
        description: `Status: ${cancelData.status} - ${cancelData.responseTime}ms`,
      });
      
    } catch (error: any) {
      setError(error.message || "Cancel order request failed");
      setResponse(null);
      toast({
        title: "Cancel order failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleExecute = () => {
    if (bulkMode) {
      processBulkRequests();
      return;
    }

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

    // Validate required parameters for selected endpoint
    if (selectedEndpoint) {
      const endpoint = API_ENDPOINTS.find(ep => ep.id === selectedEndpoint);
      if (endpoint) {
        const missingParams = endpoint.parameters
          .filter(param => param.required && !parameters[param.key]?.trim())
          .map(param => param.label);
        
        if (missingParams.length > 0) {
          toast({
            title: "Missing Required Parameters",
            description: `Please fill in: ${missingParams.join(", ")}`,
            variant: "destructive",
          });
          return;
        }
        
        // Special handling for cancel order
        if (selectedEndpoint === "cancel-order") {
          const orderId = parameters.orderid?.trim();
          if (orderId) {
            handleCancelOrder(orderId);
            return;
          }
        }
      }
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
    setBulkResults([]);
    setBulkInput("");
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
                {/* Quick Endpoint Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <List className="w-4 h-4 text-blue-600" />
                    Quick API Selection
                  </Label>
                  <Select value={selectedEndpoint || "custom"} onValueChange={handleEndpointSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an API endpoint or custom" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Custom URL</SelectItem>
                      {API_ENDPOINTS.map((endpoint) => (
                        <SelectItem key={endpoint.id} value={endpoint.id}>
                          {endpoint.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEndpoint && (
                    <p className="text-xs text-slate-600 mt-1">
                      {API_ENDPOINTS.find(ep => ep.id === selectedEndpoint)?.description}
                    </p>
                  )}
                </div>

                {/* Dynamic Parameters */}
                {selectedEndpoint && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-green-600" />
                      <Label className="text-sm font-medium text-slate-700">
                        Required Parameters
                      </Label>
                    </div>
                    {API_ENDPOINTS.find(ep => ep.id === selectedEndpoint)?.parameters.map((param) => (
                      <div key={param.key} className="space-y-1">
                        <Label htmlFor={param.key} className="text-sm font-medium text-slate-700">
                          {param.label} {param.required && <span className="text-red-500">*</span>}
                        </Label>
                        <Input
                          id={param.key}
                          type="text"
                          value={parameters[param.key] || ""}
                          onChange={(e) => setParameters(prev => ({
                            ...prev,
                            [param.key]: e.target.value
                          }))}
                          placeholder={param.placeholder}
                          className="text-sm"
                          required={param.required}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* API Endpoint URL */}
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-sm font-medium text-slate-700">
                    {showCustomUrl ? 'API Endpoint URL' : 'Generated URL'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="url"
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://api.brandsforlessuae.com/..."
                      className="font-mono text-sm pr-10"
                      readOnly={!showCustomUrl}
                    />
                    <Link className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                  {!showCustomUrl && (
                    <p className="text-xs text-slate-600 mt-1">
                      This URL is automatically generated from your parameter inputs above.
                    </p>
                  )}
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
                      <SelectItem value="HEAD">HEAD</SelectItem>
                      <SelectItem value="OPTIONS">OPTIONS</SelectItem>
                      <SelectItem value="TRACE">TRACE</SelectItem>
                      <SelectItem value="CONNECT">CONNECT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bulk Mode Toggle */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Bulk Processing Mode
                    </Label>
                    <Button
                      onClick={() => setBulkMode(!bulkMode)}
                      variant={bulkMode ? "default" : "outline"}
                      size="sm"
                      className={bulkMode ? "bg-purple-600 hover:bg-purple-700" : ""}
                    >
                      {bulkMode ? "ON" : "OFF"}
                    </Button>
                  </div>
                  
                  {bulkMode && (
                    <div className="space-y-2">
                      <Label htmlFor="bulkInput" className="text-sm font-medium text-slate-700">
                        Bulk Input Values
                        <span className="text-xs text-slate-500 ml-2">(one per line)</span>
                      </Label>
                      <Textarea
                        id="bulkInput"
                        value={bulkInput}
                        onChange={(e) => setBulkInput(e.target.value)}
                        placeholder="11111&#10;22222&#10;33333&#10;44444"
                        className="font-mono text-sm resize-none min-h-[100px]"
                      />
                      <p className="text-xs text-slate-600">
                        Each line will be used as the primary parameter value for the selected endpoint.
                      </p>
                    </div>
                  )}
                </div>

                {/* Execute Button */}
                <Button
                  onClick={handleExecute}
                  disabled={proxyMutation.isPending || (bulkMode && bulkResults.some(r => r.status === 'pending'))}
                  className={`w-full transition-all duration-200 ${
                    bulkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  size="lg"
                >
                  {proxyMutation.isPending || (bulkMode && bulkResults.some(r => r.status === 'pending')) ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      {bulkMode ? 'Processing Bulk...' : 'Fetching...'}
                    </>
                  ) : (
                    <>
                      {bulkMode ? <Layers className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                      {bulkMode ? 'Execute Bulk Requests' : 'Execute Request'}
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
                    {bulkMode ? (
                      <BarChart3 className="w-5 h-5 text-purple-600" />
                    ) : (
                      <Code className="w-5 h-5 text-blue-600" />
                    )}
                    <h2 className="text-lg font-semibold text-slate-900">
                      {bulkMode ? 'Bulk Processing Results' : 'API Response'}
                    </h2>
                    {!bulkMode && response && (
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
                    {bulkMode && bulkResults.length > 0 && (
                      <Badge className="bg-purple-100 text-purple-800">
                        {bulkResults.filter(r => r.status === 'success').length} / {bulkResults.length} successful
                      </Badge>
                    )}
                    {!bulkMode && error && (
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
                {!response && !error && !proxyMutation.isPending && bulkResults.length === 0 && (
                  <div className="min-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Play className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-lg font-medium mb-2">Ready to Execute</p>
                      <p className="text-slate-400 text-sm">
                        Configure your request and click "{bulkMode ? 'Execute Bulk Requests' : 'Execute Request'}" to see the API response
                      </p>
                    </div>
                  </div>
                )}

                {(proxyMutation.isPending || bulkResults.some(r => r.status === 'pending')) && (
                  <div className="min-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-600 font-medium">
                        {bulkMode ? 'Processing bulk requests...' : 'Executing request...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Bulk Results Display */}
                {bulkMode && bulkResults.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-purple-600" />
                        Bulk Processing Results
                      </h3>
                      <div className="flex gap-4 text-sm">
                        <span className="text-green-600 font-medium">
                          ✓ {bulkResults.filter(r => r.status === 'success').length} Success
                        </span>
                        <span className="text-red-600 font-medium">
                          ✗ {bulkResults.filter(r => r.status === 'error').length} Failed
                        </span>
                        <span className="text-yellow-600 font-medium">
                          ⏳ {bulkResults.filter(r => r.status === 'pending').length} Pending
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {bulkResults.map((result, index) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 ${
                            result.status === 'success' ? 'border-green-200 bg-green-50' :
                            result.status === 'error' ? 'border-red-200 bg-red-50' :
                            'border-yellow-200 bg-yellow-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">#{index + 1}</span>
                              <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                                {result.value}
                              </span>
                            </div>
                            <Badge
                              variant={result.status === 'success' ? 'default' : 'destructive'}
                              className={
                                result.status === 'success' ? 'bg-green-100 text-green-800' :
                                result.status === 'error' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {result.status === 'success' && result.response && (
                                <span>{result.response.status} {result.response.statusText}</span>
                              )}
                              {result.status === 'error' && 'Error'}
                              {result.status === 'pending' && 'Processing...'}
                            </Badge>
                          </div>
                          
                          {result.status === 'success' && result.response && (
                            <div className="mt-3">
                              <div className="text-xs text-slate-600 mb-2 flex gap-4">
                                <span>Time: {result.response.responseTime}ms</span>
                                <span>Size: {formatBytes(result.response.size)}</span>
                              </div>
                              <JsonViewer data={result.response.data} />
                            </div>
                          )}
                          
                          {result.status === 'error' && (
                            <div className="mt-2 text-red-700 text-sm">
                              {result.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Single Response Display */}
                {!bulkMode && response && (
                  <div>
                    <JsonViewer data={response.data} />
                  </div>
                )}

                {!bulkMode && error && (
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
