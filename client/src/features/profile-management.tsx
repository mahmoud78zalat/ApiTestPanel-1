/**
 * Profile Management Feature
 * 
 * This module handles customer profile collection, display, and export functionality
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { JsonViewer } from "@/components/json-viewer";
import { 
  Database, 
  Download, 
  Trash2, 
  Eye, 
  FileText, 
  Upload, 
  Users,
  MapPin,
  DollarSign
} from "lucide-react";
import type { CustomerProfile } from "@shared/schema";
import { formatDate } from "@/utils/date-utils";
import { formatCurrency, getActualCurrency, getCountryFromCurrency, normalizeCountryName, getShippingAddressFromOrders } from "@/utils/currency-utils";

interface ProfileManagementProps {
  /** Array of collected customer profiles */
  profiles: CustomerProfile[];
  /** Callback to remove a profile */
  onRemoveProfile: (customerId: string) => void;
  /** Callback to clear all profiles */
  onClearProfiles: () => void;
  /** Callback to export profiles */
  onExportProfiles: (format: 'csv' | 'txt') => void;
  /** Callback to show upload dialog */
  onShowUpload: () => void;
}

export function ProfileManagement({
  profiles,
  onRemoveProfile,
  onClearProfiles,
  onExportProfiles,
  onShowUpload
}: ProfileManagementProps) {
  // Calculate collection statistics
  // Sort profiles by total spending (highest first)
  const sortedProfiles = [...profiles].sort((a, b) => 
    (b.totalPurchasesAmount || 0) - (a.totalPurchasesAmount || 0)
  );

  const totalProfiles = profiles.length;
  const countryCounts = profiles.reduce((acc, profile) => {
    // First try to get country from address
    let country = profile.addresses?.[0]?.country;
    
    // If no address country or it's unknown, try to determine from currency
    if (!country || country === 'Unknown') {
      country = getCountryFromCurrency(profile.latestOrders || []);
    }
    
    // Normalize country name to avoid duplicates
    country = normalizeCountryName(country || 'Unknown');
    
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate currency totals grouped by currency type
  const currencyTotals = profiles.reduce((acc, profile) => {
    const currency = getActualCurrency(profile.latestOrders || []);
    const amount = profile.totalPurchasesAmount || 0;
    acc[currency] = (acc[currency] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  // Check if we have multiple currencies
  const currencyKeys = Object.keys(currencyTotals);
  const hasMultipleCurrencies = currencyKeys.length > 1;

  if (totalProfiles === 0) {
    return (
      <Card className="w-full mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Customer Profile Collection</h3>
            </div>
            <Button variant="outline" size="sm" onClick={onShowUpload}>
              <Upload className="w-4 h-4 mr-2" />
              Import IDs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No customer profiles collected yet</p>
            <p className="text-sm">Use "Fetch Full Profile" endpoint to start collecting customer data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Customer Profile Collection</h3>
            <Badge variant="outline">{totalProfiles} profiles</Badge>
          </div>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onExportProfiles('csv')}
              data-testid="button-export-csv"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export CSV
            </Button>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onExportProfiles('txt')}
              data-testid="button-export-txt"
            >
              <FileText className="w-4 h-4 mr-2" />
              Export TXT
            </Button>

            <Button variant="outline" size="sm" onClick={onShowUpload}>
              <Upload className="w-4 h-4 mr-2" />
              Import IDs
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onClearProfiles}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <div className="text-lg font-semibold text-blue-900">{totalProfiles}</div>
              <div className="text-sm text-blue-700">Total Customers</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
            <MapPin className="w-5 h-5 text-green-600" />
            <div>
              <div className="text-lg font-semibold text-green-900">
                {Object.keys(countryCounts).length}
              </div>
              <div className="text-sm text-green-700">Countries</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-purple-600" />
            <div>
              {hasMultipleCurrencies ? (
                <div className="text-sm font-semibold text-purple-900">
                  {currencyKeys.map((currency, index) => (
                    <div key={currency} className={index > 0 ? "mt-1" : ""}>
                      {formatCurrency(currencyTotals[currency], currency)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-lg font-semibold text-purple-900">
                  {currencyKeys.length > 0 
                    ? formatCurrency(currencyTotals[currencyKeys[0]], currencyKeys[0])
                    : "No purchases"
                  }
                </div>
              )}
              <div className="text-sm text-purple-700">Total Value</div>
            </div>
          </div>
        </div>

        {/* Country Breakdown */}
        {Object.keys(countryCounts).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Country Distribution:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(countryCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([country, count]) => (
                  <Badge key={country} variant="secondary">
                    {country}: {count}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Profile List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedProfiles.map((profile, index) => (
            <ProfileCard
              key={`profile-${profile.customerId}-${index}`}
              profile={profile}
              onRemove={() => onRemoveProfile(profile.customerId)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProfileCardProps {
  profile: CustomerProfile;
  onRemove: () => void;
}

function ProfileCard({ profile, onRemove }: ProfileCardProps) {
  const primaryAddress = profile.addresses?.[0];
  const currency = getActualCurrency(profile.latestOrders);
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-medium text-lg">{profile.fullName}</div>
              <div className="text-sm text-gray-600">
                ID: {profile.customerId}
                {profile.email && <> • {profile.email}</>}
                {profile.phoneNumber && <> • {profile.phoneNumber}</>}
              </div>
            </div>
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
            {profile.totalOrdersCount && (
              <Badge variant="outline">
                {profile.totalOrdersCount} orders
              </Badge>
            )}
            <Badge variant="outline">
              {formatCurrency(profile.totalPurchasesAmount, currency)}
            </Badge>
            {(() => {
              if (primaryAddress) {
                return (
                  <Badge variant="outline">
                    📍 {primaryAddress.city}, {primaryAddress.country}
                  </Badge>
                );
              } else {
                const shippingAddress = getShippingAddressFromOrders(profile.latestOrders || []);
                if (shippingAddress) {
                  return (
                    <Badge variant="outline">
                      📦 {shippingAddress}
                    </Badge>
                  );
                }
              }
              return null;
            })()}
            {profile.birthDate && (
              <Badge variant="outline">
                Born: {formatDate(profile.birthDate)}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex space-x-2">
          {/* View Details Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Customer Profile Details</DialogTitle>
              </DialogHeader>
              <div className="overflow-auto">
                <ProfileDetailsView profile={profile} />
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={onRemove}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProfileDetailsView({ profile }: { profile: CustomerProfile }) {
  const currency = getActualCurrency(profile.latestOrders);
  
  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
          <div className="space-y-1 text-sm">
            <div><strong>Customer ID:</strong> {profile.customerId}</div>
            <div><strong>Full Name:</strong> {profile.fullName}</div>
            <div><strong>Email:</strong> {profile.email || 'Not available'}</div>
            <div><strong>Phone:</strong> {profile.phoneNumber || 'Not available'}</div>
            <div><strong>Birthday:</strong> {formatDate(profile.birthDate)}</div>
            <div><strong>Gender:</strong> {profile.gender || 'Not available'}</div>
            <div><strong>Registration:</strong> {formatDate(profile.registerDate) || 'Not available'}</div>
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Purchase Summary</h4>
          <div className="space-y-1 text-sm">
            <div><strong>Total Orders:</strong> {profile.totalOrdersCount || 0}</div>
            <div><strong>Total Amount:</strong> {formatCurrency(profile.totalPurchasesAmount, currency)}</div>
            <div><strong>Data Collected:</strong> {formatDate(profile.fetchedAt, 'long')}</div>
          </div>
        </div>
      </div>

      {/* Addresses */}
      {profile.addresses && profile.addresses.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Addresses ({profile.addresses.length})</h4>
          <div className="space-y-2">
            {profile.addresses.map((address, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded border text-sm">
                <div className="font-medium">
                  {address.name || `${address.firstname || address.firstName || ''} ${address.lastname || address.lastName || ''}`.trim() || 'Address'}
                </div>
                <div>{address.addressLine1 || address.address || 'No address line provided'}</div>
                {(address.area || address.city) && (
                  <div>{address.area && address.city ? `${address.area}, ${address.city}` : address.area || address.city}</div>
                )}
                {address.country && <div>{address.country}</div>}
                {address.phone && <div className="text-gray-600">Phone: {address.phone}</div>}
                {address.zipcode && <div className="text-gray-600">ZIP: {address.zipcode}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {profile.latestOrders && profile.latestOrders.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">
            Recent Orders ({profile.latestOrders.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {profile.latestOrders.slice(0, 10).map((order, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded border text-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div><strong>Order ID:</strong> {order.orderId || order.id || 'Unknown'}</div>
                    <div><strong>Date:</strong> {formatDate(order.createDate || order.orderDate)}</div>
                    <div><strong>Status:</strong> {order.orderStatus || order.shipStatus || order.status || 'Unknown'}</div>
                    {order.paymentMethod && order.paymentMethod !== 'Unknown' && (
                      <div><strong>Payment:</strong> {order.paymentMethod}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {order.transactionAmount || formatCurrency(parseFloat(order.totalAmount || order.subtotal || '0'), currency)}
                    </div>
                  </div>
                </div>
                {order.invoiceUrl && (
                  <div className="mt-1">
                    <a 
                      href={order.invoiceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs"
                    >
                      View Invoice
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Data */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Raw Profile Data</h4>
        <JsonViewer data={profile} className="max-h-64" />
      </div>
    </div>
  );
}