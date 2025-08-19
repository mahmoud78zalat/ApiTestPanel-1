/**
 * Profile Collection Hook
 * 
 * This hook manages the collection and storage of customer profiles
 */

import { useState, useCallback } from "react";
import type { CustomerProfile } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToTXT, downloadFile } from "@/utils/export-utils-fixed";
import { parseFileContent } from "@/utils/export-utils";
import type { ExportFormat } from "@/utils/export-utils";
import { getShippingAddressFromOrders } from "@/utils/currency-utils";

export const useProfileCollection = () => {
  const { toast } = useToast();
  const [collectedProfiles, setCollectedProfiles] = useState<CustomerProfile[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);

  /**
   * Adds a single profile to the collection with duplicate tracking
   */
  const addProfile = useCallback((profile: CustomerProfile, onDuplicate?: (customerId: string) => void) => {
    let isDuplicate = false;
    
    setCollectedProfiles(prev => {
      // Check if profile already exists (by customerId)
      const existingIndex = prev.findIndex(p => p.customerId === profile.customerId);
      
      if (existingIndex >= 0) {
        // Update existing profile
        isDuplicate = true;
        setDuplicateCount(count => count + 1);
        onDuplicate?.(profile.customerId);
        
        const updated = [...prev];
        updated[existingIndex] = profile;
        return updated;
      } else {
        // Add new profile
        return [...prev, profile];
      }
    });

    toast({
      title: isDuplicate ? "Profile Updated" : "Profile Added",
      description: isDuplicate 
        ? `Customer profile ${profile.customerId} already exists - updated with latest data.`
        : `Customer profile ${profile.customerId} has been collected.`,
    });
  }, [toast]);

  /**
   * Adds multiple profiles to the collection with duplicate tracking
   */
  const addProfiles = useCallback((profiles: CustomerProfile[], onDuplicate?: (customerId: string) => void) => {
    let duplicatesFound = 0;
    let newProfilesAdded = 0;
    
    setCollectedProfiles(prev => {
      const updated = [...prev];
      
      profiles.forEach(profile => {
        const existingIndex = updated.findIndex(p => p.customerId === profile.customerId);
        
        if (existingIndex >= 0) {
          duplicatesFound++;
          onDuplicate?.(profile.customerId);
          updated[existingIndex] = profile;
        } else {
          newProfilesAdded++;
          updated.push(profile);
        }
      });
      
      setDuplicateCount(count => count + duplicatesFound);
      return updated;
    });

    toast({
      title: "Bulk Profiles Processed",
      description: `Added ${newProfilesAdded} new profiles, updated ${duplicatesFound} duplicates.`,
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
   * Clears all collected profiles and resets duplicate counter
   */
  const clearProfiles = useCallback(() => {
    setCollectedProfiles([]);
    setDuplicateCount(0);
    
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
      const content = await file.text();
      const customerIds = parseFileContent(content, format);
      
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
    getCollectionStats,
    duplicateCount
  };
};