/**
 * Profile Collection Hook
 * 
 * This hook manages the collection and storage of customer profiles
 */

import { useState, useCallback } from "react";
import type { CustomerProfile } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToTXT, downloadFile, parseUploadedFile } from "@/utils/export-utils";
import type { ExportFormat } from "@/utils/export-utils";

export const useProfileCollection = () => {
  const { toast } = useToast();
  const [collectedProfiles, setCollectedProfiles] = useState<CustomerProfile[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  /**
   * Adds a single profile to the collection
   */
  const addProfile = useCallback((profile: CustomerProfile) => {
    setCollectedProfiles(prev => {
      // Check if profile already exists (by customerId)
      const existingIndex = prev.findIndex(p => p.customerId === profile.customerId);
      
      if (existingIndex >= 0) {
        // Update existing profile
        const updated = [...prev];
        updated[existingIndex] = profile;
        return updated;
      } else {
        // Add new profile
        return [...prev, profile];
      }
    });

    toast({
      title: "Profile Added",
      description: `Customer profile ${profile.customerId} has been collected.`,
    });
  }, [toast]);

  /**
   * Adds multiple profiles to the collection
   */
  const addProfiles = useCallback((profiles: CustomerProfile[]) => {
    setCollectedProfiles(prev => {
      const updated = [...prev];
      
      profiles.forEach(profile => {
        const existingIndex = updated.findIndex(p => p.customerId === profile.customerId);
        
        if (existingIndex >= 0) {
          updated[existingIndex] = profile;
        } else {
          updated.push(profile);
        }
      });
      
      return updated;
    });

    toast({
      title: "Profiles Added",
      description: `${profiles.length} customer profiles have been collected.`,
    });
  }, [toast]);

  /**
   * Removes a profile from the collection
   */
  const removeProfile = useCallback((customerId: string) => {
    setCollectedProfiles(prev => prev.filter(p => p.customerId !== customerId));
    
    toast({
      title: "Profile Removed",
      description: `Customer profile ${customerId} has been removed.`,
    });
  }, [toast]);

  /**
   * Clears all collected profiles
   */
  const clearProfiles = useCallback(() => {
    setCollectedProfiles([]);
    
    toast({
      title: "Profiles Cleared",
      description: "All collected profiles have been removed.",
    });
  }, [toast]);

  /**
   * Exports profiles to specified format
   */
  const exportProfiles = useCallback((format: ExportFormat) => {
    if (collectedProfiles.length === 0) {
      toast({
        title: "No data to export",
        description: "Please collect some customer profiles first",
        variant: "destructive",
      });
      return;
    }

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        content = exportToCSV(collectedProfiles);
        filename = `customer-profiles-${timestamp}.csv`;
        mimeType = 'text/csv';
      } else {
        content = exportToTXT(collectedProfiles);
        filename = `customer-profiles-${timestamp}.txt`;
        mimeType = 'text/plain';
      }

      downloadFile(content, filename, mimeType);

      toast({
        title: "Export Successful",
        description: `${collectedProfiles.length} profiles exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "An error occurred while exporting profiles",
        variant: "destructive",
      });
    }
  }, [collectedProfiles, toast]);

  /**
   * Imports customer IDs from an uploaded file
   */
  const importFromFile = useCallback(async (file: File, format: ExportFormat): Promise<string[]> => {
    try {
      const customerIds = await parseUploadedFile(file, format);
      
      toast({
        title: "Import Successful",
        description: `Found ${customerIds.length} customer IDs in the uploaded file`,
      });
      
      return customerIds;
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Failed to parse the uploaded file",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  /**
   * Gets collection statistics
   */
  const getCollectionStats = useCallback(() => {
    const total = collectedProfiles.length;
    const countryCounts = collectedProfiles.reduce((acc, profile) => {
      const country = profile.addresses?.[0]?.country || 'Unknown';
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalPurchases = collectedProfiles.reduce((sum, profile) => 
      sum + (profile.totalPurchasesAmount || 0), 0
    );

    return {
      total,
      countryCounts,
      totalPurchases,
      countries: Object.keys(countryCounts).length
    };
  }, [collectedProfiles]);

  return {
    collectedProfiles,
    showUploadDialog,
    setShowUploadDialog,
    addProfile,
    addProfiles,
    removeProfile,
    clearProfiles,
    exportProfiles,
    importFromFile,
    getCollectionStats
  };
};