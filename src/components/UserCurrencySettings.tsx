import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { getSupportedCurrencies } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface UserCurrencySettingsProps {
  currentCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

export function UserCurrencySettings({ currentCurrency, onCurrencyChange }: UserCurrencySettingsProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(currentCurrency);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const supportedCurrencies = getSupportedCurrencies();
  
  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateProfilePreferences({ currency: selectedCurrency });
      onCurrencyChange(selectedCurrency);
      toast({
        title: "Currency Updated",
        description: `Your preferred currency has been set to ${selectedCurrency}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update currency preference",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Settings</CardTitle>
        <CardDescription>
          Choose your preferred currency for displaying prices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Preferred Currency</label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {supportedCurrencies.map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={loading || selectedCurrency === currentCurrency}
        >
          {loading ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}