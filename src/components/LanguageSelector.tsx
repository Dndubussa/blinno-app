import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";

interface LanguageSelectorProps {
  variant?: "default" | "compact";
  showIcon?: boolean;
}

export function LanguageSelector({ variant = "default", showIcon = true }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language || 'en');
  const [updatingLanguage, setUpdatingLanguage] = useState(false);

  useEffect(() => {
    // Set language from user preferences if available
    if (profile?.language) {
      i18n.changeLanguage(profile.language);
      setCurrentLanguage(profile.language);
    } else {
      // Use detected or default language
      const detectedLang = i18n.language || 'en';
      i18n.changeLanguage(detectedLang);
      setCurrentLanguage(detectedLang);
    }
  }, [profile, i18n]);

  const handleLanguageChange = async (newLanguage: string) => {
    if (newLanguage === currentLanguage) return;

    setUpdatingLanguage(true);
    try {
      // Change language immediately
      await i18n.changeLanguage(newLanguage);
      setCurrentLanguage(newLanguage);

      // Save to user preferences if logged in
      if (user) {
        await api.updateProfilePreferences({ language: newLanguage });
        toast({
          title: "Language Updated",
          description: `Language changed to ${SUPPORTED_LANGUAGES.find(l => l.code === newLanguage)?.name || newLanguage}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update language",
        variant: "destructive",
      });
    } finally {
      setUpdatingLanguage(false);
    }
  };

  const getLanguageDisplay = (code: string) => {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang ? lang.nativeName : code.toUpperCase();
  };

  if (variant === "compact") {
    return (
      <Select
        value={currentLanguage}
        onValueChange={handleLanguageChange}
        disabled={updatingLanguage}
      >
        <SelectTrigger className="w-16 h-9 text-xs">
          {showIcon && <Globe className="h-3 w-3 mr-1" />}
          <SelectValue>
            {currentLanguage.toUpperCase()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.nativeName} ({lang.name})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select
      value={currentLanguage}
      onValueChange={handleLanguageChange}
      disabled={updatingLanguage}
    >
      <SelectTrigger className="w-32 h-9">
        {showIcon && <Globe className="h-4 w-4 mr-2" />}
        <SelectValue>
          {getLanguageDisplay(currentLanguage)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.name})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

