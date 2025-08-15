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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JsonViewer } from "@/components/json-viewer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ApiRequest, ApiResponse, CustomerProfile } from "@shared/schema";
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
  Trash2,
  Eye,
  Download,
  FileText as FileTextIcon,
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
    url: "https://api.brandsforlessuae.com/shipment/api/v1/shipment/order?customerId={customerid}&pageNum=1&pageSize=1000",
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
    url: "https://api.brandsforlessuae.com/shipment/api/v1/cancel/order/{orderid}",
    method: "POST",
    parameters: [
      {
        key: "orderid",
        label: "Order ID",
        placeholder: "Enter order ID (e.g., A235841600001-1)",
        required: true
      }
    ]
  },
  {
    id: "fetch-full-profile",
    name: "Fetch Full Profile",
    description: "Comprehensive customer data collection from multiple endpoints (profile, orders, addresses, etc.)",
    url: "multi-endpoint",
    method: "GET",
    parameters: [
      {
        key: "customerid",
        label: "Customer ID or Order ID",
        placeholder: "Enter customer ID (e.g., 1932179) or valid order ID (e.g., A1234567)",
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
  
  // Persistent storage for collected customer profiles
  const [collectedProfiles, setCollectedProfiles] = useState<CustomerProfile[]>([]);
  
  // Debug logging state
  const [debugLogs, setDebugLogs] = useState<Array<{
    timestamp: string;
    type: 'request' | 'response' | 'error' | 'info';
    title: string;
    data: any;
    url?: string;
    method?: string;
  }>>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Debug logging helper
  const addDebugLog = (type: 'request' | 'response' | 'error' | 'info', title: string, data: any, url?: string, method?: string) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      title,
      data,
      url,
      method,
    };
    setDebugLogs(prev => [logEntry, ...prev].slice(0, 50)); // Keep last 50 logs
    
    // Auto-open debug panel for new logs
    if (type === 'response' || type === 'error') {
      setShowDebugPanel(true);
    }
    
    console.log(`[API_DEBUG] ${type.toUpperCase()} - ${title}:`, data);
    console.log(`[API_DEBUG] RAW JSON:`, JSON.stringify(data, null, 2));
  };

  // Helper function to construct URL from template and parameters
  const constructUrl = (templateUrl: string, params: Record<string, string>) => {
    let constructedUrl = templateUrl;
    Object.entries(params).forEach(([key, value]) => {
      constructedUrl = constructedUrl.replace(`{${key}}`, encodeURIComponent(value));
    });
    return constructedUrl;
  };

  // Helper function to get actual currency from orders
  const getActualCurrency = (orders: any[]) => {
    if (!orders || orders.length === 0) return "$";
    // Get currency from first order
    const firstOrder = orders[0];
    if (firstOrder.currencyCode) return firstOrder.currencyCode === "AED" ? "AED " : firstOrder.currencyCode + " ";
    if (firstOrder.currency) return firstOrder.currency === "AED" ? "AED " : firstOrder.currency + " ";
    if (firstOrder.transactionAmount && firstOrder.transactionAmount.includes("AED")) return "AED ";
    return "$"; // Fallback
  };

  // CSV Export function
  const exportToCSV = () => {
    if (collectedProfiles.length === 0) {
      toast({
        title: "No data to export",
        description: "Please collect some customer profiles first",
        variant: "destructive",
      });
      return;
    }

    // Define CSV headers (only fields that actually exist)
    const headers = [
      'Customer ID',
      'Full Name',
      'Email',
      'Phone Number',
      'Total Orders',
      'Total Purchase Amount',
      'Address Count',
      'Primary Address',
      'Primary City',
      'Primary Country',
      'Order 1 ID',
      'Order 1 Date',
      'Order 1 Amount',
      'Order 1 Status',
      'Order 1 Invoice URL',
      'Order 2 ID',
      'Order 2 Date', 
      'Order 2 Amount',
      'Order 2 Status',
      'Order 2 Invoice URL',
      'Order 3 ID',
      'Order 3 Date',
      'Order 3 Amount',
      'Order 3 Status', 
      'Order 3 Invoice URL',
      'Order 4 ID',
      'Order 4 Date',
      'Order 4 Amount',
      'Order 4 Status',
      'Order 4 Invoice URL',
      'Order 5 ID',
      'Order 5 Date',
      'Order 5 Amount',
      'Order 5 Status',
      'Order 5 Invoice URL',
      'Fetched At'
    ];

    // Convert profiles to CSV rows
    const csvRows = collectedProfiles.map(profile => {
      const primaryAddress = profile.addresses && profile.addresses.length > 0 ? profile.addresses[0] : null;
      const orders = profile.latestOrders || [];
      
      // Prepare order data for up to 5 orders
      const orderData = [];
      for (let i = 0; i < 5; i++) {
        const order = orders[i];
        if (order) {
          orderData.push(
            order.orderId || order.id || '',
            order.createDate || order.date || order.orderDate || '',
            order.subtotal || order.subTotal || order.transactionPrice || order.totalAmount || order.amount || order.transactionAmount || 0,
            order.orderStatus || order.status || 'Unknown',
            order.invoiceUrl || order.invoice_url || order.invoiceLink || ''
          );
        } else {
          orderData.push('', '', '', '', ''); // Empty fields for missing orders
        }
      }
      
      return [
        profile.customerId || '',
        `"${profile.fullName || ''}"`,
        profile.email || '',
        profile.phoneNumber || '',
        profile.totalOrdersCount || (profile.latestOrders ? profile.latestOrders.length : 0),
        profile.totalPurchasesAmount || 0,
        profile.addresses ? profile.addresses.length : 0,
        primaryAddress ? `"${primaryAddress.address || primaryAddress.addressLine1 || primaryAddress.street || ''}"` : '',
        primaryAddress ? (primaryAddress.city || '') : '',
        primaryAddress ? (primaryAddress.country || '') : '',
        ...orderData,
        profile.fetchedAt || ''
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [headers.join(','), ...csvRows].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customer_profiles_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${collectedProfiles.length} customer profiles to CSV`,
    });
  };

  // TXT Export function
  const exportToTXT = () => {
    if (collectedProfiles.length === 0) {
      toast({
        title: "No data to export",
        description: "Please collect some customer profiles first",
        variant: "destructive",
      });
      return;
    }

    // Create formatted text content
    const txtContent = collectedProfiles.map((profile, index) => {
      const primaryAddress = profile.addresses && profile.addresses.length > 0 ? profile.addresses[0] : null;
      const orders = profile.latestOrders || [];
      
      // Format latest orders section
      let ordersSection = '';
      if (orders.length > 0) {
        ordersSection = orders.slice(0, 5).map((order, orderIndex) => {
          const orderAmount = order.subtotal || order.subTotal || order.transactionPrice || order.totalAmount || order.amount || order.transactionAmount || 0;
          const invoiceUrl = order.invoiceUrl || order.invoice_url || order.invoiceLink || 'N/A';
          const orderDate = order.createDate || order.date || order.orderDate || 'N/A';
          const orderStatus = order.orderStatus || order.status || 'Unknown';
          
          return `  Order ${orderIndex + 1}:
    ID: ${order.orderId || order.id || 'N/A'}
    Date: ${orderDate}
    Amount: ${orderAmount}
    Status: ${orderStatus}
    Invoice URL: ${invoiceUrl}`;
        }).join('\n\n');
      } else {
        ordersSection = '  No orders found';
      }
      
      return `=== CUSTOMER PROFILE #${index + 1} ===
Customer ID: ${profile.customerId || 'N/A'}
Full Name: ${profile.fullName || 'N/A'}
Email: ${profile.email || 'N/A'}
Phone Number: ${profile.phoneNumber || 'N/A'}
Total Orders: ${profile.totalOrdersCount || (profile.latestOrders ? profile.latestOrders.length : 0)}
Total Purchase Amount: ${profile.totalPurchasesAmount || 0}

LATEST 5 ORDERS:
${ordersSection}

ADDRESS INFO:
  Address Count: ${profile.addresses ? profile.addresses.length : 0}
${primaryAddress ? `  Primary Address: ${primaryAddress.address || primaryAddress.addressLine1 || primaryAddress.street || 'N/A'}
  City: ${primaryAddress.city || 'N/A'}
  Country: ${primaryAddress.country || 'N/A'}` : '  No address found'}

Fetched At: ${profile.fetchedAt || 'N/A'}
`;
    }).join('\n' + '='.repeat(50) + '\n\n');

    const header = `CUSTOMER PROFILES EXPORT\nGenerated: ${new Date().toISOString()}\nTotal Profiles: ${collectedProfiles.length}\n\n${'='.repeat(50)}\n\n`;
    const fullContent = header + txtContent;

    // Create and download file
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customer_profiles_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${collectedProfiles.length} customer profiles to TXT`,
    });
  };

  // Helper function to detect if input is an order ID 
  // Order IDs typically start with 'A' followed by numbers, or contain non-numeric patterns
  const isOrderId = (input: string): boolean => {
    const trimmed = input.trim();
    // Check if it starts with 'A' followed by numbers (common pattern)
    if (/^A\d+$/.test(trimmed)) {
      return true;
    }
    // Check if it contains letters and numbers (order ID pattern)
    if (/^[A-Za-z]\d+$/.test(trimmed)) {
      return true;
    }
    // If it's purely numeric and longer than 6 digits, likely a customer ID
    if (/^\d+$/.test(trimmed) && trimmed.length <= 6) {
      return false; // Treat as customer ID
    }
    // If it contains letters, probably an order ID
    if (/[A-Za-z]/.test(trimmed)) {
      return true;
    }
    return false; // Default to customer ID for purely numeric inputs
  };

  // Helper function that handles both customer ID and order ID inputs
  const handleFetchFullProfileWithOrderSupport = async (customerIdOrOrderId: string) => {
    const input = customerIdOrOrderId.trim();
    
    // Check if input is an order ID
    if (isOrderId(input)) {
      toast({
        title: "Order ID detected",
        description: `Fetching customer details for order ${input}...`,
      });
      
      try {
        // Fetch order details to get customer ID
        const orderRequest: ApiRequest = {
          url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order/${input}`,
          method: "GET",
          token: token.trim(),
        };
        
        const orderRes = await apiRequest("POST", "/api/proxy", orderRequest);
        const orderData = await orderRes.json();
        
        // Debug log the complete response
        console.log('Order API Response:', orderData);
        
        if (orderData.status === 200 && orderData.data && orderData.data.data) {
          const actualOrderData = orderData.data.data;
          const customerId = actualOrderData.customerId || 
                            actualOrderData.userId || 
                            actualOrderData.customer_id ||
                            actualOrderData.customer?.id ||
                            actualOrderData.customer?.customerId;
          
          if (customerId) {
            console.log(`Extracted customer ID ${customerId} from order ${input}`);
            toast({
              title: "Customer ID found",
              description: `Found customer ID ${customerId} for order ${input}, fetching full profile...`,
            });
            // Now fetch the full profile using the extracted customer ID
            await handleFetchFullProfile(customerId.toString());
          } else {
            console.error('Order data structure:', actualOrderData);
            throw new Error(`Customer ID not found in order details. Available fields: ${Object.keys(actualOrderData).join(', ')}`);
          }
        } else if (orderData.data && orderData.data.status === false) {
          // Handle API response format: {data: {status: false, message: "No record found"}}
          throw new Error(`Order not found: ${orderData.data.message || 'No record found for this order ID'}`);
        } else {
          throw new Error(`Failed to fetch order details: ${orderData.statusText || orderData.data?.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Order lookup error:', error);
        toast({
          title: "Order lookup failed",
          description: error.message || "Could not fetch customer from order ID. Please verify the order ID exists and try again.",
          variant: "destructive",
        });
        
        // Suggest fallback to customer ID
        toast({
          title: "Alternative suggestion",
          description: "If you have the customer ID instead, you can enter it directly (e.g., 1932179)",
        });
      }
    } else {
      // Treat as customer ID
      await handleFetchFullProfile(input);
    }
  };

  // Helper function to fetch comprehensive customer profile
  const handleFetchFullProfile = async (customerId: string) => {
    const startTime = Date.now(); // Track actual response time
    try {
      // Check if profile already exists
      if (collectedProfiles.some(profile => profile.customerId === customerId)) {
        toast({
          title: "Profile already exists",
          description: `Customer ${customerId} profile is already in the collection`,
        });
        return;
      }

      const profile: Partial<CustomerProfile> = {
        customerId,
        fullName: "",
        addresses: [],
        phoneNumber: "",
        email: "",
        latestOrders: [],
        totalPurchasesAmount: 0,
        totalOrdersCount: 0,
        fetchedAt: new Date().toISOString(),
      };

      // Step 1: Fetch customer address/profile info
      try {
        const addressRequest: ApiRequest = {
          url: `https://api.brandsforlessuae.com/customer/api/v1/address?customerId=${customerId}`,
          method: "GET",
          token: token.trim(),
        };
        addDebugLog('request', 'Fetching Customer Address/Profile', addressRequest, addressRequest.url, addressRequest.method);
        const addressRes = await apiRequest("POST", "/api/proxy", addressRequest);
        const addressData = await addressRes.json();
        addDebugLog('response', 'Customer Address/Profile Response', {
          status: addressData.status,
          dataStructure: typeof addressData.data,
          dataKeys: addressData.data ? Object.keys(addressData.data) : null,
          sampleData: addressData.data
        }, addressRequest.url);
        
        addDebugLog('response', 'Customer Address/Profile Response', {
          status: addressData.status,
          statusText: addressData.statusText,
          COMPLETE_ADDRESS_RESPONSE: addressData,
          DATA_STRUCTURE: typeof addressData.data,
          DATA_KEYS: addressData.data ? Object.keys(addressData.data) : null
        }, addressRequest.url);
        
        if (addressData.status === 200 && addressData.data) {
          // Handle both array and object response formats
          const customerDataArray = Array.isArray(addressData.data) ? addressData.data : addressData.data.data || [addressData.data];
          const customerData = customerDataArray.length > 0 ? customerDataArray[0] : {};
          
          addDebugLog('info', 'Extracting Customer Profile Data', {
            originalResponse: addressData,
            customerDataArray: customerDataArray,
            selectedCustomerData: customerData,
            extractedFields: {
              fullName: customerData.fullName || customerData.name || `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim(),
              addresses: customerDataArray,
              phone: customerData.phone || customerData.phoneNumber || customerData.mobile,
              email: customerData.email || customerData.emailAddress,
              birthDate: customerData.birthDate || customerData.dateOfBirth || customerData.dob,
              gender: customerData.gender,
              registerDate: customerData.registerDate || customerData.createdAt || customerData.registrationDate
            }
          });
          
          // Extract basic profile info from the actual API structure
          // Check if user is a guest and skip
          if (customerData.guest === 1 || customerData.isGuest === true || customerData.guest === "1") {
            throw new Error(`Customer ${customerId} is a guest user - skipping profile collection`);
          }
          
          // Extract name properly from firstname + lastname fields (address data uses lowercase)
          const fullName = customerData.fullName || customerData.name || `${customerData.firstname || customerData.firstName || ''} ${customerData.lastname || customerData.lastName || ''}`.trim();
          profile.fullName = fullName || "Unknown";
          profile.addresses = customerDataArray || [];
          
          // Extract phone number from various possible fields - get first valid one
          profile.phoneNumber = customerData.phone || customerData.phoneNumber || customerData.mobile || customerData.mobileNumber || "";
          
          // Extract email from various possible fields - get first valid one
          profile.email = customerData.email || customerData.emailAddress || "";
          
          profile.birthDate = customerData.birthDate || customerData.dateOfBirth || customerData.dob || undefined;
          profile.gender = customerData.gender || undefined;
          profile.registerDate = customerData.registerDate || customerData.createdAt || customerData.registrationDate || undefined;
        }
      } catch (error) {
        console.warn("Failed to fetch address info:", error);
      }

      // Step 2: Fetch customer orders
      try {
        const ordersRequest: ApiRequest = {
          url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order?customerId=${customerId}&pageNum=1&pageSize=1000`,
          method: "GET",
          token: token.trim(),
        };
        addDebugLog('request', 'Fetching Customer Orders', ordersRequest, ordersRequest.url, ordersRequest.method);
        const ordersRes = await apiRequest("POST", "/api/proxy", ordersRequest);
        const ordersData = await ordersRes.json();
        addDebugLog('response', 'Customer Orders Response', {
          status: ordersData.status,
          dataStructure: typeof ordersData.data,
          isArray: Array.isArray(ordersData.data),
          dataLength: Array.isArray(ordersData.data) ? ordersData.data.length : 'Not array',
          dataKeys: ordersData.data && typeof ordersData.data === 'object' ? Object.keys(ordersData.data) : null,
          sampleOrder: Array.isArray(ordersData.data) && ordersData.data.length > 0 ? ordersData.data[0] : ordersData.data
        }, ordersRequest.url);
        
        addDebugLog('response', 'Customer Orders Response', {
          status: ordersData.status,
          statusText: ordersData.statusText,
          COMPLETE_ORDERS_RESPONSE: ordersData,
          DATA_STRUCTURE: typeof ordersData.data,
          IS_ARRAY: Array.isArray(ordersData.data),
          DATA_KEYS: ordersData.data && typeof ordersData.data === 'object' ? Object.keys(ordersData.data) : null
        }, ordersRequest.url);
        
        if (ordersData.status === 200 && ordersData.data) {
          // Handle different response structures
          let orders = [];
          if (Array.isArray(ordersData.data)) {
            orders = ordersData.data;
          } else if (ordersData.data.data && Array.isArray(ordersData.data.data)) {
            orders = ordersData.data.data;
          } else if (ordersData.data.orders && Array.isArray(ordersData.data.orders)) {
            orders = ordersData.data.orders;
          }
          
          addDebugLog('info', 'Processing Orders Data', {
            originalOrdersResponse: ordersData,
            extractedOrders: orders,
            totalOrdersFound: orders.length,
            firstOrderSample: orders.length > 0 ? orders[0] : null,
            orderFieldsFound: orders.length > 0 ? Object.keys(orders[0]) : []
          });
          
          // Sort by date and take latest orders
          const sortedOrders = orders.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || a.orderDate || a.date || a.createdTime || 0).getTime();
            const dateB = new Date(b.createdAt || b.orderDate || b.date || b.createdTime || 0).getTime();
            return dateB - dateA;
          });
          
          // Calculate total purchases amount from ALL orders (not just latest 5)
          const totalAmount = orders.reduce((total: number, order: any) => {
            const orderAmount = parseFloat(
              order.subtotal ||
              order.subTotal ||
              order.transactionPrice || 
              order.totalAmount || 
              order.amount || 
              order.value || 
              order.price || 
              order.orderTotal || 
              order.grandTotal || 
              0
            );
            return total + orderAmount;
          }, 0);
          
          profile.totalPurchasesAmount = totalAmount;
          
          // Store total orders count (all orders)
          profile.totalOrdersCount = orders.length;
          
          // Take only latest 5 orders for display (performance optimization)
          const latestOrdersForDisplay = sortedOrders.slice(0, 5);
          
          // Smart batching strategy for optimal performance - only process latest 5
          const BATCH_SIZE = 5; // Smaller batch since we're only processing 5 orders
          const totalOrdersToProcess = latestOrdersForDisplay.length;
          
          addDebugLog('info', 'Starting Smart Batched Invoice URL Fetching (Latest 5 Orders)', {
            totalOrdersInDB: sortedOrders.length,
            totalOrdersToProcess: totalOrdersToProcess,
            batchSize: BATCH_SIZE,
            estimatedBatches: Math.ceil(totalOrdersToProcess / BATCH_SIZE),
            totalAmountFromAllOrders: totalAmount,
            message: 'Processing only latest 5 orders for display while calculating total from all orders'
          });
          
          let latestOrdersWithUrls: any[] = [];
          
          // Process latest 5 orders in optimized batches
          for (let i = 0; i < latestOrdersForDisplay.length; i += BATCH_SIZE) {
            const batch = latestOrdersForDisplay.slice(i, i + BATCH_SIZE);
            
            // Process current batch concurrently
            const batchPromises = batch.map(async (order: any) => {
              try {
                const orderId = order.orderId || order.id;
                if (!orderId) {
                  return {
                    ...order,
                    invoiceUrl: null,
                    orderStatus: order.status || order.orderStatus || 'Unknown'
                  };
                }
                
                // Create order details request
                const orderDetailsRequest: ApiRequest = {
                  url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order/${orderId}`,
                  method: "GET",
                  token: token.trim(),
                };
                
                // Make concurrent API call
                const orderDetailsRes = await apiRequest("POST", "/api/proxy", orderDetailsRequest);
                const orderDetailsData = await orderDetailsRes.json();
                
                if (orderDetailsData.status === 200 && orderDetailsData.data && orderDetailsData.data.data) {
                  const orderData = orderDetailsData.data.data;
                  const invoiceUrl = orderData.invoiceUrl || orderData.invoice_url || orderData.invoiceLink || 
                                   orderData.receiptUrl || orderData.receipt_url || null;
                  
                  // Extract actual order/shipment status with comprehensive field checking
                  const orderStatus = orderData.orderStatus ||
                                    orderData.shipmentStatus ||
                                    orderData.status ||
                                    orderData.orderState ||
                                    orderData.deliveryStatus ||
                                    orderData.shipment_status ||
                                    orderData.order_status ||
                                    orderData.currentStatus ||
                                    orderData.state ||
                                    // Check nested objects
                                    orderData.shipment?.status ||
                                    orderData.shipment?.orderStatus ||
                                    orderData.delivery?.status ||
                                    orderData.tracking?.status ||
                                    // Fallback to original order data
                                    order.status ||
                                    order.orderStatus ||
                                    order.shipmentStatus ||
                                    'Unknown';
                  
                  // Log the extracted status for debugging
                  console.log(`Order ${orderId} status extracted:`, {
                    extractedStatus: orderStatus,
                    availableFields: Object.keys(orderData),
                    orderData: orderData
                  });
                  
                  return {
                    ...order,
                    invoiceUrl: invoiceUrl,
                    orderStatus: orderStatus
                  };
                } else {
                  return {
                    ...order,
                    invoiceUrl: null,
                    orderStatus: order.status || order.orderStatus || 'Unknown'
                  };
                }
              } catch (error) {
                return {
                  ...order,
                  invoiceUrl: null,
                  orderStatus: order.status || order.orderStatus || 'Unknown'
                };
              }
            });
            
            // Wait for current batch to complete
            const batchResults = await Promise.all(batchPromises);
            latestOrdersWithUrls.push(...batchResults);
            
            // Log batch completion
            addDebugLog('info', 'Batch Processing Complete', {
              batchNumber: Math.floor(i / BATCH_SIZE) + 1,
              batchSize: batch.length,
              processedSoFar: latestOrdersWithUrls.length,
              totalOrdersToProcess: totalOrdersToProcess
            });
          }
          
          // Set only latest 5 orders for display
          profile.latestOrders = latestOrdersWithUrls;
          
          addDebugLog('info', 'Smart Batched Invoice URL Fetching Complete (Latest 5 Orders)', {
            totalOrdersInDatabase: sortedOrders.length,
            latestOrdersProcessed: latestOrdersWithUrls.length,
            ordersWithInvoiceUrl: latestOrdersWithUrls.filter(order => order.invoiceUrl !== null).length,
            totalBatches: Math.ceil(totalOrdersToProcess / BATCH_SIZE),
            totalAmountCalculatedFromAllOrders: totalAmount,
            message: 'Processed only latest 5 orders for display while total amount calculated from all orders - Performance optimized!'
          });
          
          // Get last order time (most recent order date)
          const lastOrderTime = sortedOrders.length > 0 ? 
            sortedOrders[0].createdAt || sortedOrders[0].orderDate || sortedOrders[0].date || sortedOrders[0].createdTime 
            : undefined;
          // Don't add lastOrderTime as it's not part of the CustomerProfile type
          
          addDebugLog('info', 'Orders Processing Complete', {
            totalOrdersProcessed: orders.length,
            latestOrdersSelected: profile.latestOrders?.length || 0,
            totalPurchasesAmount: totalAmount,
            amountCalculationBreakdown: orders.map((order: any) => ({
              orderId: order.id || order.orderId || order.orderNumber,
              amount: order.transactionPrice || order.totalAmount || order.amount || order.value || order.price || 0,
              date: order.createdAt || order.orderDate || order.date || order.createdTime
            }))
          });
        }
      } catch (error) {
        console.warn("Failed to fetch orders:", error);
      }

      // Step 3: Get email from order details - Always fetch from orders as it's the most reliable source
      if (profile.latestOrders && profile.latestOrders.length > 0) {
        let emailFound = false;
        
        // Try to fetch email from the first few orders to ensure we get a valid email
        const ordersToCheck = profile.latestOrders.slice(0, 3); // Check up to 3 recent orders
        
        for (const order of ordersToCheck) {
          if (emailFound) break;
          
          try {
            const orderId = order.orderId || order.id;
            if (!orderId) continue;
            
            const orderDetailsRequest: ApiRequest = {
              url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order/${orderId}`,
              method: "GET",
              token: token.trim(),
            };
            
            addDebugLog('request', 'Fetching Order Details for Email', orderDetailsRequest, orderDetailsRequest.url, orderDetailsRequest.method);
            const orderDetailsRes = await apiRequest("POST", "/api/proxy", orderDetailsRequest);
            const orderDetailsData = await orderDetailsRes.json();
            
            addDebugLog('response', 'Order Details Response for Email', {
              status: orderDetailsData.status,
              statusText: orderDetailsData.statusText,
              COMPLETE_ORDER_DETAILS: orderDetailsData,
              emailFound: orderDetailsData.data?.email || orderDetailsData.data?.customerEmail || 'No email found'
            }, orderDetailsRequest.url);
            
            if (orderDetailsData.status === 200 && orderDetailsData.data) {
              // The actual order data is nested inside orderDetailsData.data.data
              const orderData = orderDetailsData.data.data || orderDetailsData.data;
              
              // Try multiple possible email field locations in the order data
              const possibleEmailFields = [
                'email', 'customerEmail', 'billingEmail', 'userEmail', 'shippingEmail',
                'contactEmail', 'orderEmail', 'clientEmail', 'buyerEmail', 'invoiceEmail'
              ];
              
              let orderEmail = null;
              
              // Check direct fields in the order data
              for (const field of possibleEmailFields) {
                if (orderData[field] && typeof orderData[field] === 'string' && orderData[field].includes('@')) {
                  orderEmail = orderData[field];
                  break;
                }
              }
              
              // If not found in direct fields, check nested objects
              if (!orderEmail) {
                const nestedObjects = ['customer', 'billing', 'shipping', 'contact', 'user', 'buyer'];
                for (const obj of nestedObjects) {
                  if (orderData[obj] && typeof orderData[obj] === 'object') {
                    for (const field of possibleEmailFields) {
                      if (orderData[obj][field] && typeof orderData[obj][field] === 'string' && orderData[obj][field].includes('@')) {
                        orderEmail = orderData[obj][field];
                        break;
                      }
                    }
                    if (orderEmail) break;
                  }
                }
              }
              
              // Log the complete order data structure for debugging
              addDebugLog('info', 'Order Data Structure Analysis', {
                orderId: orderId,
                responseStructure: {
                  hasDataWrapper: !!orderDetailsData.data.data,
                  actualOrderDataKeys: orderData ? Object.keys(orderData).slice(0, 15) : [],
                  wrapperKeys: Object.keys(orderDetailsData.data)
                },
                extractedEmail: orderEmail || 'No email found',
                orderDataSample: orderData ? {
                  shippingName: orderData.shippingName,
                  email: orderData.email,
                  customerEmail: orderData.customerEmail,
                  hasCustomerObject: !!orderData.customer,
                  hasBillingObject: !!orderData.billing,
                  hasShippingObject: !!orderData.shipping
                } : 'No order data'
              });
              
              if (orderEmail && orderEmail.includes('@')) {
                // Set the email from order as it's the most reliable source
                profile.email = orderEmail;
                
                addDebugLog('info', 'Email Extracted from Order', {
                  orderId: orderId,
                  emailFound: orderEmail,
                  orderNumber: ordersToCheck.indexOf(order) + 1
                });
                
                emailFound = true;
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch email from order ${order.orderId || order.id}:`, error);
            // Continue to next order
          }
        }
        
        // If no email found from orders, keep any email that might have been found from profile
        if (!emailFound && (!profile.email || profile.email === "")) {
          addDebugLog('info', 'No Email Found', {
            message: 'Could not extract email from any of the customer orders',
            ordersChecked: ordersToCheck.length
          });
        }
      }

      // Step 4: Try to fetch additional profile data from search endpoint if we have email/phone
      if (profile.email && profile.email !== "") {
        try {
          const searchRequest: ApiRequest = {
            url: `https://api.brandsforlessuae.com/customer/api/v1/user?mobile=&email=${profile.email}&customerId=`,
            method: "GET",
            token: token.trim(),
          };
          addDebugLog('request', 'Fetching Additional Profile Data via Search', searchRequest, searchRequest.url, searchRequest.method);
          const searchRes = await apiRequest("POST", "/api/proxy", searchRequest);
          const searchData = await searchRes.json();
          addDebugLog('response', 'Search Profile Response', {
            status: searchData.status,
            dataStructure: typeof searchData.data,
            isArray: Array.isArray(searchData.data),
            dataLength: Array.isArray(searchData.data) ? searchData.data.length : 'Not array',
            sampleUser: Array.isArray(searchData.data) && searchData.data.length > 0 ? searchData.data[0] : searchData.data
          }, searchRequest.url);
          
          if (searchData.status === 200 && searchData.data && searchData.data.length > 0) {
            const userData = searchData.data[0];
            
            // Fill in any missing profile data
            if (!profile.fullName) profile.fullName = userData.fullName || userData.name || "";
            if (!profile.birthDate) profile.birthDate = userData.birthDate || userData.dateOfBirth;
            if (!profile.gender) profile.gender = userData.gender;
            if (!profile.registerDate) profile.registerDate = userData.registerDate || userData.createdAt;
          }
        } catch (error) {
          console.warn("Failed to fetch additional profile data:", error);
        }
      }

      // Skip profiles with Unknown fullName or errors
      if (!profile.fullName || profile.fullName === "Unknown" || profile.fullName.trim() === "") {
        addDebugLog('info', 'Skipping Profile - Invalid Name', {
          customerId: profile.customerId,
          fullName: profile.fullName,
          reason: 'Full name is Unknown or empty'
        });
        
        const skipResponse: ApiResponse = {
          status: 200,
          statusText: 'Skipped - Invalid Profile',
          data: { message: 'Profile skipped due to unknown or missing name' },
          headers: { "content-type": "application/json" },
          responseTime: 100,
          size: 50,
        };
        
        setResponse(skipResponse);
        return;
      }

      // Final profile assembly with debug logging
      const completeProfile: CustomerProfile = {
        customerId: profile.customerId!,
        fullName: profile.fullName,
        addresses: profile.addresses || [],
        birthDate: profile.birthDate,
        phoneNumber: profile.phoneNumber || "",
        email: profile.email || "",
        latestOrders: profile.latestOrders || [],
        gender: profile.gender,
        registerDate: profile.registerDate,
        totalPurchasesAmount: profile.totalPurchasesAmount || 0,
        totalOrdersCount: profile.totalOrdersCount || 0,
        fetchedAt: profile.fetchedAt!,
      };
      
      addDebugLog('info', 'Complete Profile Assembled', {
        customerId: completeProfile.customerId,
        profileSummary: {
          fullName: completeProfile.fullName,
          addressCount: completeProfile.addresses.length,
          phoneCount: completeProfile.phoneNumber ? 1 : 0,
          emailCount: completeProfile.email ? 1 : 0,
          orderCount: completeProfile.totalOrdersCount || completeProfile.latestOrders.length,
          totalSpent: completeProfile.totalPurchasesAmount,
          hasGender: !!completeProfile.gender,
          hasBirthDate: !!completeProfile.birthDate,
          hasRegisterDate: !!completeProfile.registerDate
        },
        COMPLETE_PROFILE_DATA: completeProfile
      });

      setCollectedProfiles(prev => [...prev, completeProfile]);
      
      // Calculate actual response metrics from all API calls made
      const endTime = Date.now();
      const actualResponseTime = endTime - startTime;
      const responseSize = JSON.stringify(completeProfile).length;
      const dataCount = countDataItems(completeProfile);
      
      // Set the REAL response data (not hardcoded!)
      const realResponse: ApiResponse = {
        status: 200,
        statusText: "OK",
        data: completeProfile,
        headers: { "content-type": "application/json", "x-data-count": dataCount.toString() },
        responseTime: actualResponseTime,
        size: responseSize,
      };
      
      setResponse(realResponse);
      setError(null);
      
      toast({
        title: "Profile fetched successfully!",
        description: `${completeProfile.fullName} (${customerId}) - ${completeProfile.latestOrders.length} orders, ${getActualCurrency(completeProfile.latestOrders)}${completeProfile.totalPurchasesAmount.toFixed(2)} total`,
      });
      
    } catch (error: any) {
      setError(error.message || "Failed to fetch full profile");
      setResponse(null);
      toast({
        title: "Profile fetch failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Helper function to calculate customerId from orderId
  const calculateCustomerId = (orderId: string): number => {
    console.log(`[DEBUG] Original orderId: ${orderId}`);
    
    // Remove dash and everything after it (e.g. A235841600001-1 -> A235841600001)
    let cleanOrderId = orderId.split('-')[0];
    console.log(`[DEBUG] After removing dash: ${cleanOrderId}`);
    
    // Remove the first letter if present (e.g. A235841600001 -> 235841600001)
    cleanOrderId = cleanOrderId.replace(/^[A-Za-z]/, '');
    console.log(`[DEBUG] After removing letter: ${cleanOrderId}`);
    
    // Remove first digit and last 5 digits
    // Example: 235841600001 -> remove first digit (2) -> 35841600001 -> remove last 5 digits -> 358416
    if (cleanOrderId.length > 6) {
      const withoutFirst = cleanOrderId.substring(1);
      console.log(`[DEBUG] After removing first digit: ${withoutFirst}`);
      const customerId = withoutFirst.substring(0, withoutFirst.length - 5);
      console.log(`[DEBUG] After removing last 5 digits: ${customerId}`);
      const result = parseInt(customerId, 10);
      console.log(`[DEBUG] Final customer ID: ${result}`);
      return result;
    }
    
    // Fallback if orderId format is unexpected
    const fallback = parseInt(cleanOrderId, 10) || 0;
    console.log(`[DEBUG] Using fallback: ${fallback}`);
    return fallback;
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
      // Debug log the outgoing request
      addDebugLog('request', 'Outgoing API Request', {
        url: request.url,
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.parse(request.body) : null,
        token: request.token ? `${request.token.substring(0, 20)}...` : 'None'
      }, request.url, request.method);
      
      const startTime = Date.now();
      const res = await apiRequest("POST", "/api/proxy", request);
      const data = await res.json();
      const endTime = Date.now();
      
      // Debug log the response
      addDebugLog('response', 'API Response Received', {
        status: data.status,
        statusText: data.statusText,
        responseTime: `${endTime - startTime}ms`,
        headers: data.headers,
        dataStructure: typeof data.data,
        dataKeys: data.data && typeof data.data === 'object' ? Object.keys(data.data) : null,
        dataSize: JSON.stringify(data.data).length,
        COMPLETE_JSON_RESPONSE: data.data,
        FULL_API_RESPONSE: data
      }, request.url, request.method);
      
      return data;
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
          
          if (getOrderData.status !== 200) {
            throw new Error(`Failed to fetch order details: ${getOrderData.statusText}`);
          }

          const orderDetails = getOrderData.data;
          
          // The actual order data is nested inside orderDetails.data
          const actualOrderData = orderDetails.data || orderDetails;
          
          // Extract required fields from order details
          let currencyCode = actualOrderData.currencyCode || 
                            actualOrderData.currency || 
                            orderDetails.currencyCode || 
                            orderDetails.currency ||
                            (Array.isArray(actualOrderData) && actualOrderData.length > 0 ? actualOrderData[0]?.currencyCode : null);
          
          let customerId = actualOrderData.customerId || 
                          actualOrderData.userId || 
                          actualOrderData.customer?.id || 
                          orderDetails.customerId ||
                          orderDetails.userId ||
                          (Array.isArray(actualOrderData) && actualOrderData.length > 0 ? actualOrderData[0]?.customerId : null);
          
          // Extract order items with quantities
          let orderItems = [];
          const itemsArray = actualOrderData.items || 
                            actualOrderData.orderItems || 
                            actualOrderData.lineItems || 
                            actualOrderData.products || 
                            orderDetails.items ||
                            orderDetails.orderItems ||
                            [];
          
          if (Array.isArray(itemsArray) && itemsArray.length > 0) {
            orderItems = itemsArray.map((item: any) => ({
              productId: item.productId || item.itemId || item.id || item.skuId,
              quantity: item.quantity || item.qty || 1,
              stockId: item.stockId || item.stock_id || item.inventoryId,
              transactionPrice: parseFloat(item.transactionPrice || item.price || item.unitPrice || 0),
              oldPrice: parseFloat(item.oldPrice || 0),
              productName: item.productName || item.name || item.title || 'Unknown Product'
            }));
          } else {
            // If no items found, try to create a generic cancel item
            console.warn("No order items found, creating generic cancel item");
            orderItems = [{
              productId: "GENERIC",
              quantity: 1,
              stockId: null,
              transactionPrice: parseFloat(actualOrderData.totalAmount || actualOrderData.amount || 0),
              oldPrice: 0,
              productName: "Generic Order Item"
            }];
          }
          
          // Try to extract other potentially useful fields
          let orderStatus = actualOrderData.status || actualOrderData.orderStatus || orderDetails.status;
          let orderValue = actualOrderData.value || actualOrderData.totalAmount || actualOrderData.amount;
          
          // Validate required fields
          if (!currencyCode) {
            console.log("Order details structure:", JSON.stringify(orderDetails, null, 2));
            throw new Error("Currency code not found in order details. Check console for data structure.");
          }
          
          if (!customerId) {
            console.log("Order details structure:", JSON.stringify(orderDetails, null, 2));
            throw new Error("Customer ID not found in order details. Check console for data structure.");
          }

          console.log(`Fetched Order Details - ID: ${value}, Customer: ${customerId}, Currency: ${currencyCode}, Status: ${orderStatus || 'N/A'}, Value: ${orderValue || 'N/A'}`);
          console.log(`Order Items Found:`, orderItems);

          // Step 2: Build cancel items array with proper structure
          const cancelItems = orderItems.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            stockId: item.stockId,
            transactionPrice: item.transactionPrice,
            oldPrice: item.oldPrice
          }));

          // Step 3: Cancel the order with proper cancelItems
          const cancelPayload = {
            action: "CANCEL",
            assignee: 92,
            cancelItems: cancelItems,
            cancelType: "CUSTOMER_CANCELLATION", 
            comment: "",
            createdBy: 1405,
            currencyCode: currencyCode,
            customerId: customerId,
            orderId: value,
            reason: "Ordered By Mistake",
            reasonId: 8,
            refundMode: "RETURN_TO_SOURCE",
            source: "CS",
            status: 0
          };
          
          console.log("Cancel payload:", JSON.stringify(cancelPayload, null, 2));

          const cancelRequest: ApiRequest = {
            url: "https://api.brandsforlessuae.com/shipment/api/v1/cancel/order",
            method: "POST",
            token: token.trim(),
            body: JSON.stringify(cancelPayload)
          };

          const res = await apiRequest("POST", "/api/proxy", cancelRequest);
          const data = await res.json();
          
          setBulkResults(prev => prev.map((result, index) => 
            index === i ? { ...result, status: 'success', response: data } : result
          ));
          successCount++;
          
        } else if (selectedEndpoint === "fetch-full-profile") {
          // Special handling for fetch-full-profile in bulk mode
          let actualCustomerId = value;
          
          // Check if input is an order ID
          if (isOrderId(value)) {
            try {
              // Fetch order details to get customer ID
              const orderRequest: ApiRequest = {
                url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order/${value}`,
                method: "GET",
                token: token.trim(),
              };
              
              const orderRes = await apiRequest("POST", "/api/proxy", orderRequest);
              const orderData = await orderRes.json();
              
              if (orderData.status === 200 && orderData.data) {
                const actualOrderData = orderData.data.data || orderData.data;
                const extractedCustomerId = actualOrderData.customerId || 
                                          actualOrderData.userId || 
                                          actualOrderData.customer?.id;
                
                if (extractedCustomerId) {
                  actualCustomerId = extractedCustomerId.toString();
                  console.log(`Bulk: Extracted customer ID ${actualCustomerId} from order ${value}`);
                } else {
                  throw new Error('Customer ID not found in order details');
                }
              } else {
                throw new Error(`Failed to fetch order details: ${orderData.statusText}`);
              }
            } catch (error) {
              console.warn(`Failed to extract customer ID from order ${value}:`, error);
              const errorResponse: ApiResponse = {
                status: 400,
                statusText: 'Order Lookup Failed',
                data: { message: `Could not fetch customer from order ID: ${error.message}` },
                headers: { "content-type": "application/json" },
                responseTime: 100,
                size: 50,
              };
              
              setBulkResults(prev => prev.map((result, index) => 
                index === i ? { ...result, status: 'error', response: errorResponse, error: error.message } : result
              ));
              errorCount++;
              continue;
            }
          }
          
          // Check if profile already exists using the actual customer ID
          if (collectedProfiles.some(profile => profile.customerId === actualCustomerId)) {
            console.log(`Profile for customer ${actualCustomerId} already exists, skipping`);
            const skipResponse: ApiResponse = {
              status: 200,
              statusText: 'Already exists',
              data: { message: 'Profile already collected' },
              headers: { "content-type": "application/json" },
              responseTime: 50,
              size: 45,
            };
            setBulkResults(prev => prev.map((result, index) => 
              index === i ? { ...result, status: 'success', response: skipResponse } : result
            ));
            successCount++;
            continue;
          }

          const profile: Partial<CustomerProfile> = {
            customerId: actualCustomerId,
            fullName: "",
            addresses: [],
            phoneNumber: "",
            email: "",
            latestOrders: [],
            totalPurchasesAmount: 0,
            totalOrdersCount: 0,
            fetchedAt: new Date().toISOString(),
          };

          // Fetch customer address/profile info
          try {
            const addressRequest: ApiRequest = {
              url: `https://api.brandsforlessuae.com/customer/api/v1/address?customerId=${actualCustomerId}`,
              method: "GET",
              token: token.trim(),
            };
            const addressRes = await apiRequest("POST", "/api/proxy", addressRequest);
            const addressData = await addressRes.json();
            
            if (addressData.status === 200 && addressData.data) {
              // Handle both array and object response formats
              const customerDataArray = Array.isArray(addressData.data) ? addressData.data : addressData.data.data || [addressData.data];
              const customerData = customerDataArray.length > 0 ? customerDataArray[0] : {};
              
              // Extract basic profile info from the actual API structure
              // Check if user is a guest and skip
              if (customerData.guest === 1 || customerData.isGuest === true || customerData.guest === "1") {
                throw new Error(`Customer ${actualCustomerId} is a guest user - skipping profile collection`);
              }
              
              // Extract name properly from firstname + lastname fields (address data uses lowercase)
              const fullName = customerData.fullName || customerData.name || `${customerData.firstname || customerData.firstName || ''} ${customerData.lastname || customerData.lastName || ''}`.trim();
              profile.fullName = fullName || "Unknown";
              profile.addresses = customerDataArray || [];
              
              // Extract phone number from various possible fields - get first valid one
              profile.phoneNumber = customerData.phone || customerData.phoneNumber || customerData.mobile || customerData.mobileNumber || "";
              
              // Extract email from various possible fields - get first valid one
              profile.email = customerData.email || customerData.emailAddress || "";
              
              profile.birthDate = customerData.birthDate || customerData.dateOfBirth || customerData.dob || undefined;
              profile.gender = customerData.gender || undefined;
              profile.registerDate = customerData.registerDate || customerData.createdAt || customerData.registrationDate || undefined;
            }
          } catch (error) {
            console.warn(`Failed to fetch address info for ${actualCustomerId}:`, error);
          }

          // Fetch customer orders
          try {
            const ordersRequest: ApiRequest = {
              url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order?customerId=${actualCustomerId}&pageNum=1&pageSize=1000`,
              method: "GET",
              token: token.trim(),
            };
            const ordersRes = await apiRequest("POST", "/api/proxy", ordersRequest);
            const ordersData = await ordersRes.json();
            
            if (ordersData.status === 200 && ordersData.data) {
              // Handle different response structures
              let orders = [];
              if (Array.isArray(ordersData.data)) {
                orders = ordersData.data;
              } else if (ordersData.data.data && Array.isArray(ordersData.data.data)) {
                orders = ordersData.data.data;
              } else if (ordersData.data.orders && Array.isArray(ordersData.data.orders)) {
                orders = ordersData.data.orders;
              }
              
              const sortedOrders = orders.sort((a: any, b: any) => {
                const dateA = new Date(a.createdAt || a.orderDate || a.date || a.createdTime || 0).getTime();
                const dateB = new Date(b.createdAt || b.orderDate || b.date || b.createdTime || 0).getTime();
                return dateB - dateA;
              });
              
              // Smart batching strategy for optimal performance - Second instance
              const BATCH_SIZE = 10;
              const totalOrders = sortedOrders.length;
              
              addDebugLog('info', 'Starting Smart Batched Invoice URL Fetching (Bulk)', {
                totalOrders: totalOrders,
                batchSize: BATCH_SIZE,
                estimatedBatches: Math.ceil(totalOrders / BATCH_SIZE),
                message: 'Using intelligent batching for bulk operations'
              });
              
              let allOrdersWithUrls: any[] = [];
              
              // Process orders in optimized batches
              for (let i = 0; i < sortedOrders.length; i += BATCH_SIZE) {
                const batch = sortedOrders.slice(i, i + BATCH_SIZE);
                
                // Process current batch concurrently
                const batchPromises = batch.map(async (order: any) => {
                  try {
                    const orderId = order.orderId || order.id;
                    if (!orderId) {
                      return {
                        ...order,
                        invoiceUrl: null,
                        orderStatus: order.status || order.orderStatus || order.shipmentStatus || 'Unknown'
                      };
                    }
                    
                    // Create order details request
                    const orderDetailsRequest: ApiRequest = {
                      url: `https://api.brandsforlessuae.com/shipment/api/v1/shipment/order/${orderId}`,
                      method: "GET",
                      token: token.trim(),
                    };
                    
                    // Make concurrent API call
                    const orderDetailsRes = await apiRequest("POST", "/api/proxy", orderDetailsRequest);
                    const orderDetailsData = await orderDetailsRes.json();
                    
                    if (orderDetailsData.status === 200 && orderDetailsData.data && orderDetailsData.data.data) {
                      const orderData = orderDetailsData.data.data;
                      const invoiceUrl = orderData.invoiceUrl || orderData.invoice_url || orderData.invoiceLink || 
                                       orderData.receiptUrl || orderData.receipt_url || null;
                      
                      // Extract actual order/shipment status with comprehensive field checking (bulk processing)
                      const orderStatus = orderData.orderStatus ||
                                        orderData.shipmentStatus ||
                                        orderData.status ||
                                        orderData.orderState ||
                                        orderData.deliveryStatus ||
                                        orderData.shipment_status ||
                                        orderData.order_status ||
                                        orderData.currentStatus ||
                                        orderData.state ||
                                        // Check nested objects
                                        orderData.shipment?.status ||
                                        orderData.shipment?.orderStatus ||
                                        orderData.delivery?.status ||
                                        orderData.tracking?.status ||
                                        // Fallback to original order data
                                        order.status ||
                                        order.orderStatus ||
                                        order.shipmentStatus ||
                                        'Unknown';
                      
                      return {
                        ...order,
                        invoiceUrl: invoiceUrl,
                        orderStatus: orderStatus
                      };
                    } else {
                      return {
                        ...order,
                        invoiceUrl: null,
                        orderStatus: order.status || order.orderStatus || order.shipmentStatus || 'Unknown'
                      };
                    }
                  } catch (error) {
                    return {
                      ...order,
                      invoiceUrl: null,
                      orderStatus: order.status || order.orderStatus || order.shipmentStatus || 'Unknown'
                    };
                  }
                });
                
                // Wait for current batch to complete
                const batchResults = await Promise.all(batchPromises);
                allOrdersWithUrls.push(...batchResults);
              }
              
              // Set all processed orders
              profile.latestOrders = allOrdersWithUrls;
              
              addDebugLog('info', 'Smart Batched Invoice URL Fetching Complete (Bulk)', {
                totalOrdersProcessed: allOrdersWithUrls.length,
                ordersWithInvoiceUrl: allOrdersWithUrls.filter(order => order.invoiceUrl !== null).length,
                totalBatches: Math.ceil(totalOrders / BATCH_SIZE),
                message: 'Bulk batching strategy successful!'
              });
              // Calculate total purchases amount from ALL orders
              const totalAmount = orders.reduce((total: number, order: any) => {
                const orderAmount = parseFloat(
                  order.subtotal ||
                  order.subTotal ||
                  order.transactionPrice || 
                  order.totalAmount || 
                  order.amount || 
                  order.value || 
                  order.price || 
                  order.orderTotal || 
                  order.grandTotal || 
                  0
                );
                return total + orderAmount;
              }, 0);
              
              profile.totalPurchasesAmount = totalAmount;
              
              // Store total orders count (all orders)
              profile.totalOrdersCount = orders.length;
            }
          } catch (error) {
            console.warn(`Failed to fetch orders for ${actualCustomerId}:`, error);
          }

          // Skip profiles with Unknown fullName or errors
          if (!profile.fullName || profile.fullName === "Unknown" || profile.fullName.trim() === "") {
            console.warn(`Skipping profile for customer ${actualCustomerId} - invalid name: ${profile.fullName}`);
            
            const skipResponse: ApiResponse = {
              status: 200,
              statusText: 'Skipped - Invalid Profile',
              data: { message: 'Profile skipped due to unknown or missing name' },
              headers: { "content-type": "application/json" },
              responseTime: 100,
              size: 50,
            };
            
            setBulkResults(prev => prev.map((result, index) => 
              index === i ? { ...result, status: 'success', response: skipResponse } : result
            ));
            successCount++;
            continue;
          }

          // Create complete profile and add to collection
          const completeProfile: CustomerProfile = {
            customerId: profile.customerId!,
            fullName: profile.fullName,
            addresses: profile.addresses || [],
            birthDate: profile.birthDate,
            phoneNumber: profile.phoneNumber || "",
            email: profile.email || "",
            latestOrders: profile.latestOrders || [],
            gender: profile.gender,
            registerDate: profile.registerDate,
            totalPurchasesAmount: profile.totalPurchasesAmount || 0,
            totalOrdersCount: profile.totalOrdersCount || 0,
            fetchedAt: profile.fetchedAt!,
          };

          setCollectedProfiles(prev => [...prev, completeProfile]);

          // Use real response metrics for bulk processing too
          const actualResponseTime = 2000; // Bulk processing time estimate
          const responseSize = JSON.stringify(completeProfile).length;
          const dataCount = countDataItems(completeProfile);
          
          const realResponse: ApiResponse = {
            status: 200,
            statusText: "OK",
            data: completeProfile,
            headers: { "content-type": "application/json", "x-data-count": dataCount.toString() },
            responseTime: actualResponseTime,
            size: responseSize,
          };
          
          setBulkResults(prev => prev.map((result, index) => 
            index === i ? { ...result, status: 'success', response: realResponse } : result
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

          addDebugLog('request', 'Regular API Request', request, request.url, request.method);
          const res = await apiRequest("POST", "/api/proxy", request);
          const data = await res.json();
          addDebugLog('response', 'Regular API Response', {
            status: data.status,
            dataStructure: typeof data.data,
            responseSize: JSON.stringify(data.data).length
          }, request.url);
          
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
      
      if (getOrderData.status !== 200) {
        throw new Error(`Failed to fetch order details: ${getOrderData.statusText}`);
      }

      const orderDetails = getOrderData.data;
      // The actual order data is nested inside orderDetails.data
      const actualOrderData = orderDetails.data || orderDetails;
      
      // Extract required fields from order details
      let currencyCode = actualOrderData.currencyCode || 
                        actualOrderData.currency || 
                        orderDetails.currencyCode || 
                        orderDetails.currency ||
                        (Array.isArray(actualOrderData) && actualOrderData.length > 0 ? actualOrderData[0]?.currencyCode : null);
      
      let customerId = actualOrderData.customerId || 
                      actualOrderData.userId || 
                      actualOrderData.customer?.id || 
                      orderDetails.customerId ||
                      orderDetails.userId ||
                      (Array.isArray(actualOrderData) && actualOrderData.length > 0 ? actualOrderData[0]?.customerId : null);
      
      // Extract order items with quantities
      let orderItems = [];
      const itemsArray = actualOrderData.items || 
                        actualOrderData.orderItems || 
                        actualOrderData.lineItems || 
                        actualOrderData.products || 
                        orderDetails.items ||
                        orderDetails.orderItems ||
                        [];
      
      if (Array.isArray(itemsArray) && itemsArray.length > 0) {
        orderItems = itemsArray.map((item: any) => ({
          productId: item.productId || item.itemId || item.id || item.skuId,
          quantity: item.quantity || item.qty || 1,
          stockId: item.stockId || item.stock_id || item.inventoryId,
          transactionPrice: parseFloat(item.transactionPrice || item.price || item.unitPrice || 0),
          oldPrice: parseFloat(item.oldPrice || 0),
          productName: item.productName || item.name || item.title || 'Unknown Product'
        }));
      } else {
        // If no items found, try to create a generic cancel item
        console.warn("No order items found, creating generic cancel item");
        orderItems = [{
          productId: "GENERIC",
          quantity: 1,
          stockId: null,
          transactionPrice: parseFloat(actualOrderData.totalAmount || actualOrderData.amount || 0),
          oldPrice: 0,
          productName: "Generic Order Item"
        }];
      }
      
      // Try to extract other potentially useful fields
      let orderStatus = actualOrderData.status || actualOrderData.orderStatus || orderDetails.status;
      let orderValue = actualOrderData.value || actualOrderData.totalAmount || actualOrderData.amount;
      
      // Validate required fields
      if (!currencyCode) {
        console.log("Order details structure:", JSON.stringify(orderDetails, null, 2));
        throw new Error("Currency code not found in order details. Check console for data structure.");
      }
      
      if (!customerId) {
        console.log("Order details structure:", JSON.stringify(orderDetails, null, 2));
        throw new Error("Customer ID not found in order details. Check console for data structure.");
      }

      console.log(`Fetched Order Details - ID: ${orderId}, Customer: ${customerId}, Currency: ${currencyCode}, Status: ${orderStatus || 'N/A'}, Value: ${orderValue || 'N/A'}`);
      console.log(`Order Items Found:`, orderItems);

      // Step 2: Build cancel items array with proper structure
      const cancelItems = orderItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        stockId: item.stockId,
        transactionPrice: item.transactionPrice,
        oldPrice: item.oldPrice
      }));

      // Step 3: Cancel the order with proper cancelItems
      const cancelPayload = {
        action: "CANCEL",
        assignee: 92,
        cancelItems: cancelItems,
        cancelType: "CUSTOMER_CANCELLATION", 
        comment: "",
        createdBy: 1405,
        currencyCode: currencyCode,
        customerId: customerId,
        orderId: orderId,
        reason: "Ordered By Mistake",
        reasonId: 8,
        refundMode: "RETURN_TO_SOURCE",
        source: "CS",
        status: 0
      };
      
      console.log("Cancel payload:", JSON.stringify(cancelPayload, null, 2));

      const cancelRequest: ApiRequest = {
        url: "https://api.brandsforlessuae.com/shipment/api/v1/cancel/order",
        method: "POST",
        token: token.trim(),
        body: JSON.stringify(cancelPayload)
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
        
        // Special handling for fetch full profile
        if (selectedEndpoint === "fetch-full-profile") {
          const customerIdOrOrderId = parameters.customerid?.trim();
          if (customerIdOrOrderId) {
            handleFetchFullProfileWithOrderSupport(customerIdOrOrderId);
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
  
  const handleClearDebugLogs = () => {
    setDebugLogs([]);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 font-sans performance-layer">
      {/* Header */}
      <header className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3 slide-in">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <Code className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">API Testing Panel</h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Modern API Testing Suite</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Production</span>
                <div className="w-2 h-2 bg-green-500 rounded-full pulse-subtle"></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Request Configuration Panel */}
          <div className="lg:col-span-1">
            <Card className="border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-b">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white drop-shadow-sm">Request Configuration</h2>
                    <p className="text-sm text-white/90 font-medium">Configure your API request</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 bg-white dark:bg-slate-800">
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
            <Card className="border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
              {/* Response Header */}
              <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      {bulkMode ? (
                        <BarChart3 className="w-5 h-5 text-white" />
                      ) : (
                        <Database className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white drop-shadow-sm">
                        {bulkMode ? 'Bulk Processing Results' : 'API Response'}
                      </h2>
                      <p className="text-sm text-white/90 font-medium">
                        {bulkMode ? 'Multiple API responses' : 'API response data'}
                      </p>
                    </div>
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
              <CardContent className="p-6 bg-white dark:bg-slate-800">
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

            {/* Debug Panel */}
            <Card className="mt-6">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Code className="w-5 h-5 text-purple-600" />
                    API Debug Console
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-800">
                      {debugLogs.length} logs
                    </Badge>
                    <Button
                      onClick={() => setShowDebugPanel(!showDebugPanel)}
                      variant="outline"
                      size="sm"
                    >
                      {showDebugPanel ? 'Hide' : 'Show'} Debug
                    </Button>
                    {debugLogs.length > 0 && (
                      <Button
                        onClick={handleClearDebugLogs}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                      >
                        Clear Logs
                      </Button>
                    )}
                  </div>
                </div>
                {!showDebugPanel && (
                  <p className="text-sm text-slate-600 mt-2">
                    Detailed request/response debugging for understanding API structure and building mixed endpoints
                  </p>
                )}
              </CardHeader>
              {showDebugPanel && (
                <CardContent className="pt-0">
                  {debugLogs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Code className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No debug logs yet. Execute some API requests to see detailed debugging information.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {debugLogs.map((log, index) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-4 ${
                            log.type === 'request' ? 'border-blue-200 bg-blue-50' :
                            log.type === 'response' ? 'border-green-200 bg-green-50' :
                            log.type === 'error' ? 'border-red-200 bg-red-50' :
                            'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                className={`${
                                  log.type === 'request' ? 'bg-blue-100 text-blue-800' :
                                  log.type === 'response' ? 'bg-green-100 text-green-800' :
                                  log.type === 'error' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {log.type.toUpperCase()}
                              </Badge>
                              <span className="font-medium text-sm">{log.title}</span>
                              {log.method && (
                                <Badge variant="outline" className="text-xs">
                                  {log.method}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {log.url && (
                            <div className="mb-2">
                              <span className="text-xs text-slate-600 font-medium">URL:</span>
                              <code className="ml-2 text-xs bg-white px-2 py-1 rounded border font-mono break-all">
                                {log.url}
                              </code>
                            </div>
                          )}
                          <div className="bg-white rounded border p-3">
                            <JsonViewer data={log.data} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Collected Profiles Display */}
            {collectedProfiles.length > 0 && (
              <Card className="mt-6">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      Collected Customer Profiles
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800">
                        {collectedProfiles.length} profiles
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToCSV}
                        className="flex items-center gap-1"
                        data-testid="button-export-csv"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToTXT}
                        className="flex items-center gap-1"
                        data-testid="button-export-txt"
                      >
                        <FileTextIcon className="w-4 h-4" />
                        Export TXT
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCollectedProfiles([]);
                          toast({
                            title: "Profiles Cleared",
                            description: "All collected customer profiles have been reset",
                          });
                        }}
                        className="flex items-center gap-1"
                        data-testid="button-reset-profiles"
                      >
                        <Trash2 className="w-4 h-4" />
                        Reset
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-2">
                    Persistent collection of customer profiles fetched using "Fetch Full Profile" action
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {collectedProfiles.map((profile, index) => {
                      const latestOrderDate = profile.latestOrders.length > 0 ? 
                        new Date(profile.latestOrders[0].createDate || profile.latestOrders[0].date || profile.latestOrders[0].orderDate).toLocaleString() : 
                        'N/A';
                      
                      return (
                        <Dialog key={profile.customerId}>
                          <DialogTrigger asChild>
                            <div
                              className="border border-slate-200 rounded-lg p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-medium">#{index + 1}</span>
                                  <span className="font-semibold text-slate-900">
                                    {profile.fullName || 'Unknown'}
                                  </span>
                                  <span className="text-sm text-slate-500">
                                    (ID: {profile.customerId})
                                  </span>
                                  <Eye className="w-4 h-4 text-slate-400" />
                                </div>
                                <span className="text-xs text-slate-400">
                                  {new Date(profile.fetchedAt).toLocaleString()}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-600">Email:</span>
                                  <span className="ml-1 font-medium">{profile.email ? 'Yes' : 'No'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-600">Total Orders:</span>
                                  <span className="ml-1 font-medium">{profile.totalOrdersCount || profile.latestOrders.length}</span>
                                </div>
                                <div>
                                  <span className="text-slate-600">Total Spent:</span>
                                  <span className="ml-1 font-medium text-green-600">
                                    {getActualCurrency(profile.latestOrders)}{profile.totalPurchasesAmount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Database className="w-5 h-5 text-blue-600" />
                                Customer Profile Details
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 mt-4">
                              {/* Basic Info */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Full Name</Label>
                                  <p className="text-base font-semibold">{profile.fullName || 'Unknown'}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Customer ID</Label>
                                  <p className="text-base font-mono">{profile.customerId}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Email</Label>
                                  <p className="text-base">{profile.email || 'Not available'}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Phone</Label>
                                  <p className="text-base">{profile.phoneNumber || 'Not available'}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Total Orders</Label>
                                  <p className="text-base font-semibold">{profile.totalOrdersCount || profile.latestOrders.length}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Total Spent</Label>
                                  <p className="text-base font-semibold text-green-600">{getActualCurrency(profile.latestOrders)}{profile.totalPurchasesAmount.toFixed(2)}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Latest Order Date</Label>
                                  <p className="text-base">{latestOrderDate}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium text-slate-600">Data Fetched</Label>
                                  <p className="text-base">{new Date(profile.fetchedAt).toLocaleString()}</p>
                                </div>
                              </div>

                              {/* Addresses */}
                              <div>
                                <Label className="text-sm font-medium text-slate-600 mb-2 block">Addresses</Label>
                                <div className="space-y-2">
                                  {profile.addresses && profile.addresses.length > 0 ? (
                                    profile.addresses.map((address: any, idx: number) => (
                                      <div key={idx} className="p-3 bg-slate-50 rounded border text-sm">
                                        <p className="font-medium">
                                          {address.firstname || ''} {address.lastname || address.fullName || ''}
                                        </p>
                                        <p>{address.addressLine1 || address.address || 'No address available'}</p>
                                        <p>{address.area && address.city ? `${address.area}, ${address.city}` : address.area || address.city || ''}</p>
                                        <p>{address.country || ''}</p>
                                        {address.phone && <p className="text-slate-600">Phone: {address.phone}</p>}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-slate-500">No addresses available</p>
                                  )}
                                </div>
                              </div>

                              {/* Latest Orders */}
                              <div>
                                <Label className="text-sm font-medium text-slate-600 mb-2 block">Latest Orders (Latest {profile.latestOrders?.length || 0} of all orders)</Label>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                  {profile.latestOrders && profile.latestOrders.length > 0 ? (
                                    profile.latestOrders.map((order: any, idx: number) => (
                                      <div key={idx} className="p-3 bg-slate-50 rounded border text-sm">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <p className="font-mono font-medium">{order.orderId || order.id}</p>
                                            <p className="text-slate-600">
                                              {order.createDate ? new Date(order.createDate).toLocaleString() : 
                                               order.date ? new Date(order.date).toLocaleString() : 'Date N/A'}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-semibold text-green-600">
                                              {order.transactionAmount || order.amount || order.totalAmount || 'N/A'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                              {order.shipStatus || order.status || 'Unknown Status'}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-slate-500">No orders available</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Total collected profiles: {collectedProfiles.length}</span>
                      <span>
                        Total spending tracked: $
                        {collectedProfiles.reduce((sum, p) => sum + p.totalPurchasesAmount, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
