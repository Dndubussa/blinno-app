import { formatPrice, convertCurrency, CURRENCY_RATES } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface MultiCurrencyPriceProps {
  usdPrice: number;
  showOriginal?: boolean;
  currencies?: string[];
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function MultiCurrencyPrice({ 
  usdPrice, 
  showOriginal = true,
  currencies = ['USD', 'TZS', 'KES', 'UGX', 'NGN'],
  className = "",
  size = "md"
}: MultiCurrencyPriceProps) {
  const { user } = useAuth();
  const [userCurrency, setUserCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserCurrency = async () => {
      if (user) {
        try {
          const profile = await api.getCurrentUser();
          if (profile?.currency) {
            setUserCurrency(profile.currency);
          }
        } catch (error) {
          console.error("Error fetching user currency:", error);
        }
      }
      setLoading(false);
    };

    fetchUserCurrency();
  }, [user]);

  if (loading) {
    return <span className={className}>...</span>;
  }

  // Get prices in all currencies
  const prices = currencies.map(currency => {
    const amount = convertCurrency(usdPrice, 'USD', currency);
    return {
      currency,
      amount,
      formatted: formatPrice(amount, currency),
      isUserCurrency: currency === userCurrency,
    };
  });

  // Find user's currency price
  const userPrice = prices.find(p => p.isUserCurrency) || prices[0];

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Primary price (user's currency or USD) */}
      <div className={`font-semibold ${textSizes[size]}`}>
        {userPrice.formatted}
        {userPrice.currency !== 'USD' && showOriginal && (
          <span className="text-muted-foreground text-xs ml-2">
            ({formatPrice(usdPrice, 'USD')})
          </span>
        )}
      </div>
      
      {/* Multi-currency display */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {prices
          .filter(p => p.currency !== userPrice.currency) // Don't show user currency twice
          .map((price) => (
            <span key={price.currency} className="whitespace-nowrap">
              {price.formatted}
            </span>
          ))}
      </div>
    </div>
  );
}

