import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { api } from '@/lib/api';
import { Trash2, Plus, CreditCard, Smartphone } from 'lucide-react';

interface PayoutMethod {
  id: string;
  method_type: 'mobile_money' | 'bank_transfer';
  is_default: boolean;
  mobile_operator?: string;
  mobile_number?: string;
  bank_name?: string;
  bank_address?: string;
  account_name?: string;
  account_number?: string;
  swift_code?: string;
  created_at: string;
  updated_at: string;
}

export function PayoutMethods() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    methodType: 'mobile_money' as 'mobile_money' | 'bank_transfer',
    isDefault: false,
    mobileOperator: '',
    mobileNumber: '',
    bankName: '',
    bankAddress: '',
    accountName: '',
    accountNumber: '',
    swiftCode: '',
  });

  useEffect(() => {
    fetchPayoutMethods();
  }, []);

  const fetchPayoutMethods = async () => {
    try {
      const data = await api.getPayoutMethods();
      setMethods(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load payout methods",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.addPayoutMethod(formData);
      toast({
        title: "Success",
        description: "Payout method added successfully",
      });
      
      // Reset form and refresh methods
      setFormData({
        methodType: 'mobile_money',
        isDefault: false,
        mobileOperator: '',
        mobileNumber: '',
        bankName: '',
        bankAddress: '',
        accountName: '',
        accountNumber: '',
        swiftCode: '',
      });
      setShowForm(false);
      fetchPayoutMethods();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add payout method",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (methodId: string) => {
    try {
      await api.deletePayoutMethod(methodId);
      toast({
        title: "Success",
        description: "Payout method deleted successfully",
      });
      fetchPayoutMethods();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payout method",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      await api.setDefaultPayoutMethod(methodId);
      toast({
        title: "Success",
        description: "Default payout method updated",
      });
      fetchPayoutMethods();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set default payout method",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Loading payout methods...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Payout Methods</h3>
          <p className="text-sm text-muted-foreground">
            Manage your payout methods for receiving earnings
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Method
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Payout Method</CardTitle>
            <CardDescription>
              Add a new method to receive your earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="methodType">Method Type</Label>
                  <Select 
                    value={formData.methodType} 
                    onValueChange={(value) => handleSelectChange('methodType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile_money">
                        <div className="flex items-center">
                          <Smartphone className="mr-2 h-4 w-4" />
                          Mobile Money
                        </div>
                      </SelectItem>
                      <SelectItem value="bank_transfer">
                        <div className="flex items-center">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Bank Transfer
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                      className="mr-2"
                    />
                    Set as default method
                  </Label>
                </div>
              </div>

              {formData.methodType === 'mobile_money' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobileOperator">Mobile Operator</Label>
                      <Select 
                        value={formData.mobileOperator} 
                        onValueChange={(value) => handleSelectChange('mobileOperator', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                          <SelectItem value="Mixx by Yas">Mixx by Yas</SelectItem>
                          <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                          <SelectItem value="Halopesa">Halopesa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber">Mobile Number</Label>
                      <Input
                        id="mobileNumber"
                        name="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleInputChange}
                        placeholder="e.g., 0712345678"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        placeholder="e.g., CRDB Bank"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Name</Label>
                      <Input
                        id="accountName"
                        name="accountName"
                        value={formData.accountName}
                        onChange={handleInputChange}
                        placeholder="e.g., John Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        name="accountNumber"
                        value={formData.accountNumber}
                        onChange={handleInputChange}
                        placeholder="e.g., 1234567890"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="swiftCode">SWIFT Code (Optional)</Label>
                      <Input
                        id="swiftCode"
                        name="swiftCode"
                        value={formData.swiftCode}
                        onChange={handleInputChange}
                        placeholder="e.g., CORPTZTZ"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bankAddress">Bank Address (Optional)</Label>
                    <Input
                      id="bankAddress"
                      name="bankAddress"
                      value={formData.bankAddress}
                      onChange={handleInputChange}
                      placeholder="e.g., Dar es Salaam, Tanzania"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Payout Method
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {methods.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No payout methods added yet.</p>
            <Button 
              className="mt-4" 
              onClick={() => setShowForm(true)}
            >
              Add Your First Payout Method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {methods.map((method) => (
            <Card key={method.id} className={method.is_default ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center">
                      {method.method_type === 'mobile_money' ? (
                        <Smartphone className="mr-2 h-5 w-5" />
                      ) : (
                        <CreditCard className="mr-2 h-5 w-5" />
                      )}
                      {method.method_type === 'mobile_money' 
                        ? `${method.mobile_operator} - ${method.mobile_number}`
                        : `${method.bank_name} - ${method.account_number}`
                      }
                    </CardTitle>
                    <CardDescription>
                      {method.method_type === 'mobile_money' 
                        ? 'Mobile Money'
                        : 'Bank Transfer'
                      }
                    </CardDescription>
                  </div>
                  {method.is_default && (
                    <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      Default
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {method.method_type === 'mobile_money' ? (
                    <>
                      <div>
                        <span className="font-medium">Operator:</span> {method.mobile_operator}
                      </div>
                      <div>
                        <span className="font-medium">Number:</span> {method.mobile_number}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="font-medium">Bank:</span> {method.bank_name}
                      </div>
                      <div>
                        <span className="font-medium">Account Name:</span> {method.account_name}
                      </div>
                      <div>
                        <span className="font-medium">Account Number:</span> {method.account_number}
                      </div>
                      {method.swift_code && (
                        <div>
                          <span className="font-medium">SWIFT:</span> {method.swift_code}
                        </div>
                      )}
                      {method.bank_address && (
                        <div>
                          <span className="font-medium">Address:</span> {method.bank_address}
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  {!method.is_default && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleSetDefault(method.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleDelete(method.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}