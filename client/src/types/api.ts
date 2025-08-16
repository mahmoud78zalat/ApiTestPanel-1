/**
 * API Types and Interfaces
 * 
 * This file contains all TypeScript type definitions used throughout the application
 * for API requests, responses, and related data structures.
 */

import type { ApiResponse } from "@shared/schema";

export interface BulkProcessingResult {
  value: string;
  status: 'success' | 'error' | 'pending';
  response?: ApiResponse;
  error?: string;
}

export interface DebugLogEntry {
  timestamp: string;
  type: 'request' | 'response' | 'error' | 'info';
  title: string;
  data: any;
  url?: string;
  method?: string;
}

// Re-export types from shared schema for convenience
export type { ApiRequest, ApiResponse, CustomerProfile } from "@shared/schema";

export interface UploadDialogState {
  show: boolean;
  file: File | null;
  format: 'csv' | 'txt';
}

export interface ProfileExportData {
  customerId: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  birthday?: string;
  gender?: string;
  registerDate?: string;
  totalOrdersCount: number;
  totalPurchasesAmount: number;
  addresses: any[];
  latestOrders: any[];
}

export interface CancelOrderPayload {
  createdBy: number;
  assignee: number;
  reason: string;
  notes?: string;
}

export const CANCEL_ORDER_CONFIG = {
  CREATED_BY: 2457,
  ASSIGNEE: 105,
  DEFAULT_REASON: "Customer requested cancellation"
} as const;