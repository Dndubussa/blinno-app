import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface UserLanguageSettingsProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
}

export function UserLanguageSettings({ currentLanguage, onLanguageChange }: UserLanguageSettingsProps) {
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSelectedLanguage(currentLanguage);
  }, [currentLanguage]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.updateProfilePreferences({ language: selectedLanguage });
      await i18n.changeLanguage(selectedLanguage);
      onLanguageChange(selectedLanguage);
      toast({
        title: "Language Updated",
        description: `Your preferred language has been set to ${SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update language preference",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language Settings</CardTitle>
        <CardDescription>
          Choose your preferred language
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Preferred Language</label>
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger>
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.nativeName} ({lang.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={loading || selectedLanguage === currentLanguage}
        >
          {loading ? "Saving..." : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}

