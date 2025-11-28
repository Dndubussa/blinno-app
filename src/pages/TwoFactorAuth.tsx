import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, XCircle, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

export default function TwoFactorAuth() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [twoFactor, setTwoFactor] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    if (user) {
      fetch2FAStatus();
      fetchBackupCodes();
    } else {
      navigate("/signin");
    }
  }, [user]);

  const fetchBackupCodes = async () => {
    try {
      const result = await api.getBackupCodes();
      if (result.backupCodes && result.backupCodes.length > 0) {
        setBackupCodes(result.backupCodes);
      }
    } catch (error) {
      // Ignore if 2FA not enabled
    }
  };

  const fetch2FAStatus = async () => {
    try {
      const status = await api.get2FAStatus();
      setTwoFactor({
        isEnabled: status.isEnabled,
        secret: null,
      });
    } catch (error: any) {
      console.error("Error fetching 2FA status:", error);
      toast({
        title: t("common.error"),
        description: "Failed to load 2FA settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    try {
      const result = await api.setup2FA();
      setSecret(result.secret);
      setQrCode(result.qrCode);
      setShowSetup(true);
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to setup 2FA",
        variant: "destructive",
      });
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: t("common.invalidCode"),
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await api.verify2FA(verificationCode);
      
      if (result.success) {
        setTwoFactor({ isEnabled: true, secret });
        setShowSetup(false);
        setVerificationCode("");
        
        if (result.backupCodes) {
          setBackupCodes(result.backupCodes);
        }

        toast({
          title: t("common.twoFAEnabled"),
          description: "Two-factor authentication has been enabled",
        });
      }
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to enable 2FA",
        variant: "destructive",
      });
    }
  };

  const handleDisable2FA = async () => {
    if (!confirm("Are you sure you want to disable 2FA? This will make your account less secure.")) {
      return;
    }

    try {
      await api.disable2FA(""); // Password verification will be added
      setTwoFactor({ isEnabled: false, secret: null });
      setBackupCodes([]);
      toast({
        title: t("common.twoFADisabled"),
        description: "Two-factor authentication has been disabled",
      });
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to disable 2FA",
        variant: "destructive",
      });
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      toast({
        title: t("common.copied"),
        description: "Secret key copied to clipboard",
      });
    }
  };

  const downloadBackupCodes = () => {
    const content = backupCodes.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "blinno-2fa-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading 2FA settings...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Two-Factor Authentication</h1>
            <p className="text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    2FA Status
                  </CardTitle>
                  <CardDescription>
                    Protect your account with two-factor authentication
                  </CardDescription>
                </div>
                <Badge variant={twoFactor?.isEnabled ? "default" : "secondary"}>
                  {twoFactor?.isEnabled ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Disabled
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!twoFactor?.isEnabled ? (
                <>
                  <div>
                    <h3 className="font-semibold mb-2">What is 2FA?</h3>
                    <p className="text-sm text-muted-foreground">
                      Two-factor authentication adds an extra layer of security to your account.
                      After enabling 2FA, you'll need to enter a code from your authenticator app
                      in addition to your password when signing in.
                    </p>
                  </div>

                  {!showSetup ? (
                    <Button onClick={handleSetup2FA} className="w-full">
                      Enable 2FA
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label>Scan QR Code</Label>
                        <p className="text-sm text-muted-foreground mb-2">
                          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                        </p>
                        {qrCode && (
                          <div className="flex justify-center p-4 bg-muted rounded-md">
                            <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>Or Enter Secret Key</Label>
                        <div className="flex gap-2 mt-2">
                          <Input value={secret || ""} readOnly className="font-mono" />
                          <Button variant="outline" onClick={copySecret}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="verification-code">Enter Verification Code</Label>
                        <Input
                          id="verification-code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="000000"
                          maxLength={6}
                          className="mt-2 text-center text-2xl tracking-widest"
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                          Enter the 6-digit code from your authenticator app
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowSetup(false);
                            setVerificationCode("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleVerifyAndEnable}
                          disabled={verificationCode.length !== 6}
                          className="flex-1"
                        >
                          Verify & Enable
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      ✓ Two-factor authentication is enabled on your account
                    </p>
                  </div>

                  {backupCodes.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Backup Codes</Label>
                        <Button variant="outline" size="sm" onClick={downloadBackupCodes}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Save these codes in a safe place. You can use them to access your account
                        if you lose access to your authenticator app.
                      </p>
                      <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-md">
                        {backupCodes.map((code, idx) => (
                          <code key={idx} className="text-sm font-mono">
                            {code}
                          </code>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="destructive"
                    onClick={handleDisable2FA}
                    className="w-full"
                  >
                    Disable 2FA
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

