import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Heart, Plus, ShoppingCart, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Wishlist() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wishlists, setWishlists] = useState<any[]>([]);
  const [selectedWishlist, setSelectedWishlist] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWishlistName, setNewWishlistName] = useState("");

  useEffect(() => {
    if (user) {
      fetchWishlists();
    } else {
      navigate("/signin");
    }
  }, [user]);

  useEffect(() => {
    if (selectedWishlist) {
      fetchItems();
    }
  }, [selectedWishlist]);

  const fetchWishlists = async () => {
    try {
      const data = await api.getWishlists();
      setWishlists(data || []);
      if (data && data.length > 0 && !selectedWishlist) {
        setSelectedWishlist(data[0]);
      }
    } catch (error: any) {
      console.error("Error fetching wishlists:", error);
      toast({
        title: "Error",
        description: "Failed to load wishlists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    if (!selectedWishlist) return;

    try {
      const data = await api.getWishlistItems(selectedWishlist.id);
      setItems(data || []);
    } catch (error: any) {
      console.error("Error fetching items:", error);
      toast({
        title: "Error",
        description: "Failed to load wishlist items",
        variant: "destructive",
      });
    }
  };

  const handleCreateWishlist = async () => {
    if (!newWishlistName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a wishlist name",
        variant: "destructive",
      });
      return;
    }

    try {
      const wishlist = await api.createWishlist({
        name: newWishlistName,
        isPublic: false,
      });

      toast({
        title: "Wishlist created",
        description: "Your wishlist has been created",
      });

      setShowCreateDialog(false);
      setNewWishlistName("");
      await fetchWishlists();
      setSelectedWishlist(wishlist);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create wishlist",
        variant: "destructive",
      });
    }
  };

  const handleRemoveItem = async (item: any) => {
    try {
      await api.removeWishlistItem(selectedWishlist.id, item.item_id, {
        itemType: item.item_type,
      });

      toast({
        title: "Item removed",
        description: "Item has been removed from wishlist",
      });

      await fetchItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  const handleAddToCart = async (item: any) => {
    if (item.item_type === "product") {
      try {
        await api.addToCart(item.item_id, 1);
        toast({
          title: "Added to cart",
          description: "Item has been added to your cart",
        });
        navigate("/cart");
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to add to cart",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading wishlists...</p>
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
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">My Wishlists</h1>
              <p className="text-muted-foreground">
                Save items you love for later
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Wishlist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Wishlist</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Wishlist Name</Label>
                    <Input
                      id="name"
                      value={newWishlistName}
                      onChange={(e) => setNewWishlistName(e.target.value)}
                      placeholder="My Wishlist"
                      className="mt-2"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateWishlist}>Create</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Wishlists</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {wishlists.map((wishlist) => (
                    <Button
                      key={wishlist.id}
                      variant={
                        selectedWishlist?.id === wishlist.id
                          ? "secondary"
                          : "ghost"
                      }
                      className="w-full justify-start"
                      onClick={() => setSelectedWishlist(wishlist)}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      {wishlist.name}
                      <Badge variant="outline" className="ml-auto">
                        {wishlist.item_count || 0}
                      </Badge>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-3">
              {selectedWishlist ? (
                items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((item) => (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          {item.item_image && (
                            <img
                              src={item.item_image}
                              alt={item.item_title}
                              className="w-full h-48 object-cover rounded-md mb-4"
                            />
                          )}
                          <h3 className="font-semibold mb-2">{item.item_title}</h3>
                          <Badge variant="outline" className="mb-3">
                            {item.item_type}
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/${item.item_type}/${item.item_id}`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            {item.item_type === "product" && (
                              <Button
                                size="sm"
                                onClick={() => handleAddToCart(item)}
                              >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Add to Cart
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        This wishlist is empty
                      </p>
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">
                      Select a wishlist or create a new one
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

