import { formatPrice, convertCurrency, getLocationBasedCurrencies } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface MultiCurrencyPriceProps {
  usdPrice: number;
  showOriginal?: boolean;
  currencies?: string[]; // Optional override - if not provided, will use location-based detection
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function MultiCurrencyPrice({ 
  usdPrice, 
  showOriginal = true,
  currencies, // Optional - will be auto-detected if not provided
  className = "",
  size = "md"
}: MultiCurrencyPriceProps) {
  const { user } = useAuth();
  const [userCurrency, setUserCurrency] = useState<string>('USD');
  const [userCountry, setUserCountry] = useState<string | undefined>(undefined);
  const [displayCurrencies, setDisplayCurrencies] = useState<string[]>(['USD']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (user) {
        try {
          const profile = await api.getCurrentUser();
          if (profile?.currency) {
            setUserCurrency(profile.currency);
          }
          if (profile?.country) {
            setUserCountry(profile.country);
          }
        } catch (error) {
          console.error("Error fetching user preferences:", error);
        }
      }
      setLoading(false);
    };

    fetchUserPreferences();
  }, [user]);

  // Determine which currencies to display
  useEffect(() => {
    if (loading) return;
    
    // If currencies are explicitly provided, use them
    if (currencies && currencies.length > 0) {
      setDisplayCurrencies(currencies);
      return;
    }
    
    // Otherwise, use location-based detection
    const locationBasedCurrencies = getLocationBasedCurrencies(userCountry, userCurrency);
    setDisplayCurrencies(locationBasedCurrencies);
  }, [currencies, userCountry, userCurrency, loading]);

  if (loading) {
    return <span className={className}>...</span>;
  }

  // Get prices in relevant currencies
  const prices = displayCurrencies.map(currency => {
    const amount = convertCurrency(usdPrice, 'USD', currency);
    return {
      currency,
      amount,
      formatted: formatPrice(amount, currency),
      isUserCurrency: currency === userCurrency,
    };
  });

  // Find user's currency price (or primary local currency, or USD)
  const userPrice = prices.find(p => p.isUserCurrency) || 
                    prices.find(p => p.currency !== 'USD') || 
                    prices.find(p => p.currency === 'USD') || 
                    prices[0];

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  // Get other currencies to show (excluding the primary one)
  const otherPrices = prices.filter(p => p.currency !== userPrice.currency);

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Primary price (user's currency or local currency) */}
      <div className={`font-semibold ${textSizes[size]}`}>
        {userPrice.formatted}
        {userPrice.currency !== 'USD' && showOriginal && (
          <span className="text-muted-foreground text-xs ml-2">
            ({formatPrice(usdPrice, 'USD')})
          </span>
        )}
      </div>
      
      {/* Show other relevant currencies (if any) */}
      {otherPrices.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {otherPrices.map((price) => (
            <span key={price.currency} className="whitespace-nowrap">
              {price.formatted}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

