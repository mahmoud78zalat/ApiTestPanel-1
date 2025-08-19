/**
 * Upload Dialog Component
 * 
 * This component handles file upload functionality for importing customer IDs
 * from CSV or TXT files
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, File, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CustomerData {
  customerId: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  totalOrders?: string;
  totalAmount?: string;
}

interface UploadDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when file is successfully processed */
  onFileProcessed: (customerIds: string[]) => void;
}

export function UploadDialog({ open, onOpenChange, onFileProcessed }: UploadDialogProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadFormat, setUploadFormat] = useState<'csv' | 'txt'>('csv');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<CustomerData[]>([]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = uploadFormat === 'csv' 
      ? ['text/csv', 'application/csv'] 
      : ['text/plain'];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(`.${uploadFormat}`)) {
      toast({
        title: "Invalid File Type",
        description: `Please select a ${uploadFormat.toUpperCase()} file`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    // Generate preview
    try {
      const content = await file.text();
      const preview = await parseFilePreview(content, uploadFormat);
      setPreviewData(preview.slice(0, 5)); // Show first 5 customer profiles as preview
    } catch (error) {
      toast({
        title: "File Read Error",
        description: "Could not read the selected file",
        variant: "destructive",
      });
    }
  };

  const parseFilePreview = async (content: string, format: 'csv' | 'txt'): Promise<CustomerData[]> => {
    const customerData: CustomerData[] = [];

    if (format === 'csv') {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 2) return [];
      
      // Parse header to find column positions
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
      const idIndex = headers.findIndex(h => h.includes('customer id') || h.includes('id'));
      const nameIndex = headers.findIndex(h => h.includes('full name') || h.includes('name'));
      const emailIndex = headers.findIndex(h => h.includes('email'));
      const phoneIndex = headers.findIndex(h => h.includes('phone'));
      const ordersIndex = headers.findIndex(h => h.includes('total orders'));
      const amountIndex = headers.findIndex(h => h.includes('total purchase amount') || h.includes('amount'));
      
      // Parse first 5 data rows
      for (let i = 1; i < Math.min(lines.length, 6); i++) {
        const columns = lines[i].split(',').map(col => col.trim().replace(/"/g, ''));
        if (columns[idIndex] && columns[idIndex].trim()) {
          customerData.push({
            customerId: columns[idIndex] || '',
            fullName: nameIndex >= 0 ? columns[nameIndex] : undefined,
            email: emailIndex >= 0 ? columns[emailIndex] : undefined,
            phoneNumber: phoneIndex >= 0 ? columns[phoneIndex] : undefined,
            totalOrders: ordersIndex >= 0 ? columns[ordersIndex] : undefined,
            totalAmount: amountIndex >= 0 ? columns[amountIndex] : undefined
          });
        }
      }
    } else if (format === 'txt') {
      const lines = content.split('\n');
      let currentCustomer: Partial<CustomerData> = {};
      let customerCount = 0;
      
      for (const line of lines) {
        if (customerCount >= 5) break;
        
        if (line.includes('Customer ID:')) {
          // Save previous customer if exists
          if (currentCustomer.customerId) {
            customerData.push(currentCustomer as CustomerData);
            customerCount++;
          }
          // Start new customer
          const match = line.match(/Customer ID:\s*(.+)/);
          currentCustomer = { customerId: match?.[1]?.trim() || '' };
        } else if (line.includes('Full Name:')) {
          const match = line.match(/Full Name:\s*(.+)/);
          if (match?.[1] && currentCustomer) {
            currentCustomer.fullName = match[1].trim();
          }
        } else if (line.includes('Email:')) {
          const match = line.match(/Email:\s*(.+)/);
          if (match?.[1] && currentCustomer && !match[1].includes('Not available')) {
            currentCustomer.email = match[1].trim();
          }
        } else if (line.includes('Phone:')) {
          const match = line.match(/Phone:\s*(.+)/);
          if (match?.[1] && currentCustomer && !match[1].includes('Not available')) {
            currentCustomer.phoneNumber = match[1].trim();
          }
        } else if (line.includes('Total Orders:')) {
          const match = line.match(/Total Orders:\s*(.+)/);
          if (match?.[1] && currentCustomer) {
            currentCustomer.totalOrders = match[1].trim();
          }
        } else if (line.includes('Total Purchase Amount:') || line.includes('Total Amount:')) {
          const match = line.match(/Total (?:Purchase )?Amount:\s*(.+)/);
          if (match?.[1] && currentCustomer) {
            currentCustomer.totalAmount = match[1].trim();
          }
        }
      }
      
      // Add last customer if exists
      if (currentCustomer.customerId && customerCount < 5) {
        customerData.push(currentCustomer as CustomerData);
      }
    }

    return customerData;
  };

  const parseFullFile = async (content: string, format: 'csv' | 'txt'): Promise<string[]> => {
    const customerIds: string[] = [];

    if (format === 'csv') {
      const lines = content.split('\n').filter(line => line.trim());
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',');
        if (columns[0] && columns[0].trim()) {
          customerIds.push(columns[0].trim().replace(/"/g, ''));
        }
      }
    } else if (format === 'txt') {
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.includes('Customer ID:')) {
          const match = line.match(/Customer ID:\s*(.+)/);
          if (match && match[1]) {
            customerIds.push(match[1].trim());
          }
        }
      }
    }

    // Remove duplicates
    return Array.from(new Set(customerIds));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const content = await selectedFile.text();
      const customerIds = await parseFullFile(content, uploadFormat);

      if (customerIds.length === 0) {
        toast({
          title: "No Customer IDs Found",
          description: "The file doesn't contain any valid customer IDs",
          variant: "destructive",
        });
        return;
      }

      onFileProcessed(customerIds);
      
      toast({
        title: "Upload Successful",
        description: `Found ${customerIds.length} customer IDs in the file`,
      });

      // Reset dialog state
      setSelectedFile(null);
      setPreviewData([]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to process the uploaded file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewData([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Customer IDs</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>File Format</Label>
            <Select value={uploadFormat} onValueChange={(value: 'csv' | 'txt') => {
              setUploadFormat(value);
              clearFile(); // Clear file when format changes
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV File</SelectItem>
                <SelectItem value="txt">TXT File</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Select File</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {!selectedFile ? (
                <div>
                  <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <div className="text-sm text-gray-600 mb-2">
                    Choose a {uploadFormat.toUpperCase()} file containing customer IDs
                  </div>
                  <Input
                    type="file"
                    accept={uploadFormat === 'csv' ? '.csv' : '.txt'}
                    onChange={handleFileSelect}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFile}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {previewData.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="text-sm font-medium mb-2">Preview (first 5 customers):</div>
                <div className="space-y-2">
                  {previewData.map((customer, index) => (
                    <div key={index} className="text-xs bg-gray-100 p-2 rounded">
                      <div className="font-medium text-blue-900">ID: {customer.customerId}</div>
                      {customer.fullName && <div className="text-gray-700">Name: {customer.fullName}</div>}
                      {customer.email && <div className="text-gray-700">Email: {customer.email}</div>}
                      {customer.phoneNumber && <div className="text-gray-700">Phone: {customer.phoneNumber}</div>}
                      {customer.totalOrders && <div className="text-gray-700">Orders: {customer.totalOrders}</div>}
                      {customer.totalAmount && <div className="text-gray-700">Amount: {customer.totalAmount}</div>}
                    </div>
                  ))}
                  {previewData.length >= 5 && (
                    <div className="text-xs text-gray-500 italic">
                      ... and more customers in the file
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Format Help */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="text-sm">
                <div className="font-medium text-blue-900 mb-1">
                  Expected {uploadFormat.toUpperCase()} Format:
                </div>
                {uploadFormat === 'csv' ? (
                  <div className="text-blue-800 font-mono text-xs">
                    Customer ID,Full Name,Email...<br />
                    1405941,John Doe,john@example.com<br />
                    1932179,Jane Smith,jane@example.com
                  </div>
                ) : (
                  <div className="text-blue-800 font-mono text-xs">
                    Customer ID: 1405941<br />
                    Full Name: John Doe<br />
                    <br />
                    Customer ID: 1932179<br />
                    Full Name: Jane Smith
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isProcessing}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Import IDs'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}