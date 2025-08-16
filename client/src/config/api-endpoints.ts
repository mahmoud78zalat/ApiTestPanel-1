/**
 * API Endpoints Configuration
 * 
 * This file contains all predefined API endpoint configurations for the Brands for Less API.
 * Each endpoint includes URL template, HTTP method, required parameters, and metadata.
 */

export interface ApiEndpoint {
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

/**
 * Predefined API endpoints for Brands for Less API testing
 */
export const API_ENDPOINTS: ApiEndpoint[] = [
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

/**
 * Default API configuration values
 */
export const DEFAULT_CONFIG = {
  BASE_URL: "https://api.brandsforlessuae.com",
  DEFAULT_TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7InVzZXJJZCI6MTQwMiwibmFtZSI6IkNhcm9saW5lIFdhZ3VpaCBGcmFuY2lzIiwiYXBwTmFtZSI6ImFkbWlucGFuZWwiLCJkYXRhc2VudGVyIjoidWFlIn0sImlhdCI6MTc1NTAxODA3NywiZXhwIjoxNzg2NTU0MDc3fQ.H4rQyaqsZ30hdooK9P8ropw2zea9bDstReZLuBeeK0g",
  DEFAULT_URL: "https://api.brandsforlessuae.com/customer/api/v1/address?customerId=1932179"
} as const;