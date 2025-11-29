import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Download, Eye, Loader2, ArrowLeft, Star, ShoppingCart } from "lucide-react";
import { MultiCurrencyPrice } from "@/components/MultiCurrencyPrice";
import { formatPrice } from "@/lib/currency";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [book, setBook] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBook();
      checkPurchase();
    }
  }, [id, user]);

  const fetchBook = async () => {
    try {
      const bookData = await api.getDigitalProduct(id!);
      setBook(bookData);
    } catch (error: any) {
      console.error("Error fetching book:", error);
      toast({
        title: "Error",
        description: "Failed to load book details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkPurchase = async () => {
    if (!user) return;
    try {
      const purchases = await api.getMyPurchasedProducts();
      const purchased = purchases.some((p: any) => p.product_id === id || p.products?.id === id);
      setHasPurchased(purchased);
    } catch (error) {
      console.error("Error checking purchase:", error);
    }
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to purchase this book",
        variant: "destructive",
      });
      navigate("/signin");
      return;
    }

    if (!profile?.phone) {
      toast({
        title: "Phone Number Required",
        description: "Please add your phone number to your profile to make purchases",
        variant: "destructive",
      });
      navigate("/dashboard#profile");
      return;
    }

    setPurchasing(true);
    try {
      const result = await api.purchaseDigitalProduct(
        id!,
        profile.phone,
        user.email,
        profile.display_name || user.email
      );

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        toast({
          title: "Success",
          description: "Purchase initiated. Please complete the payment.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate purchase",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleDownload = async () => {
    if (!user || !hasPurchased) {
      toast({
        title: "Purchase Required",
        description: "You must purchase this book to download it",
        variant: "destructive",
      });
      return;
    }

    try {
      const downloadInfo = await api.downloadDigitalProduct(id!);
      if (downloadInfo.downloadUrl) {
        // Create a temporary link and click it to download
        const link = document.createElement("a");
        link.href = downloadInfo.downloadUrl;
        link.download = downloadInfo.fileName || `${book.title}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download book",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Book Details">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!book) {
    return (
      <DashboardLayout title="Book Not Found">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground mb-4">Book not found</p>
            <Button onClick={() => navigate("/marketplace")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Marketplace
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={book.title}>
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/marketplace")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Marketplace
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Book Cover and Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                {book.thumbnail_url ? (
                  <img
                    src={book.thumbnail_url}
                    alt={book.title}
                    className="w-full aspect-[2/3] object-cover rounded-lg mb-4"
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-muted rounded-lg flex items-center justify-center mb-4">
                    <BookOpen className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{book.title}</h1>
                    <p className="text-sm text-muted-foreground">
                      By {book.display_name || book.creator?.display_name || "Unknown Author"}
                    </p>
                  </div>

                  <div>
                    <MultiCurrencyPrice
                      usdPrice={book.price}
                      size="xl"
                      className="text-primary font-bold"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    {hasPurchased ? (
                      <Button onClick={handleDownload} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download Book
                      </Button>
                    ) : (
                      <Button
                        onClick={handlePurchase}
                        disabled={purchasing}
                        className="w-full"
                        size="lg"
                      >
                        {purchasing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Purchase Book
                          </>
                        )}
                      </Button>
                    )}

                    {book.preview_url && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(book.preview_url, "_blank")}
                        className="w-full"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview Book
                      </Button>
                    )}
                  </div>

                  <div className="pt-4 border-t space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Downloads:</span>
                      <span className="font-medium">{book.download_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sales:</span>
                      <span className="font-medium">{book.sales_count || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Book Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{book.description}</p>
              </CardContent>
            </Card>

            {book.tags && book.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {book.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

