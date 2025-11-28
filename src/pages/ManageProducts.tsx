import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ImageUpload } from "@/components/ImageUpload";
import type { Tables } from "@/integrations/supabase/types";
import { PLACEHOLDER_IMAGE } from "@/lib/constants";

type Product = Tables<"products">;

const ManageProducts = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    location: "",
    stock_quantity: "",
    is_active: true,
    image_url: "",
  });

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        navigate("/signin");
        return;
      }

      // Check if user is a creator or seller
      const [creatorCheck, sellerCheck] = await Promise.all([
        supabase.rpc('has_role', { _user_id: user.id, _role: 'creator' }),
        supabase.rpc('has_role', { _user_id: user.id, _role: 'seller' }),
      ]);

      const hasAccess = (creatorCheck.data || false) || (sellerCheck.data || false) || profile?.is_creator;

      if (!hasAccess) {
        toast({
          title: "Access Denied",
          description: "You must be a creator or seller to manage products",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      fetchProducts();
    };

    checkAccess();
  }, [user, profile, navigate, toast]);

  const fetchProducts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      price: "",
      category: "",
      location: "",
      stock_quantity: "",
      is_active: true,
      image_url: "",
    });
    setEditingProduct(null);
  };

  const openDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        title: product.title,
        description: product.description || "",
        price: product.price.toString(),
        category: product.category,
        location: product.location || "",
        stock_quantity: product.stock_quantity?.toString() || "",
        is_active: product.is_active ?? true,
        image_url: product.image_url || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const productData = {
        creator_id: user.id,
        title: formData.title,
        description: formData.description || null,
        price: parseFloat(formData.price),
        category: formData.category,
        location: formData.location || null,
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : null,
        is_active: formData.is_active,
        image_url: formData.image_url || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
      } else {
        const { error } = await supabase.from("products").insert(productData);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Product created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      await fetchProducts();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      await fetchProducts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);

      if (error) throw error;
      await fetchProducts();
    } catch (error: any) {
      console.error("Error toggling product status:", error);
      toast({
        title: "Error",
        description: "Failed to update product status",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Manage Products</h1>
              <p className="text-muted-foreground">Add and manage your marketplace products</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProduct
                      ? "Update your product information"
                      : "Fill in the details to add a new product to the marketplace"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Product Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price (TZS) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock_quantity">Stock Quantity</Label>
                      <Input
                        id="stock_quantity"
                        type="number"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("common.selectCategory")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Books">Books</SelectItem>
                          <SelectItem value="Crafts">Crafts</SelectItem>
                          <SelectItem value="Fashion">Fashion</SelectItem>
                          <SelectItem value="Jewelry">Jewelry</SelectItem>
                          <SelectItem value="Food">Food</SelectItem>
                          <SelectItem value="Art">Art</SelectItem>
                          <SelectItem value="Home">Home</SelectItem>
                          <SelectItem value="Electronics">Electronics</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., Dar es Salaam"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Or use the image upload below
                    </p>
                  </div>

                  {user && (
                    <div>
                      <Label>Product Image</Label>
                      <ImageUpload
                        bucket="portfolios"
                        userId={user.id}
                        onUploadComplete={(url) => setFormData({ ...formData, image_url: url })}
                        currentImage={formData.image_url}
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Product is active (visible in marketplace)</Label>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingProduct ? "Update Product" : "Create Product"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Products</CardTitle>
              <CardDescription>
                Manage all your marketplace products ({products.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No products yet</p>
                  <Button onClick={() => openDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Product
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image_url || PLACEHOLDER_IMAGE.PRODUCT_SMALL}
                              alt={product.title}
                              className="w-12 h-12 object-cover rounded"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE.PRODUCT_SMALL;
                              }}
                            />
                            <div>
                              <div className="font-medium">{product.title}</div>
                              {product.location && (
                                <div className="text-sm text-muted-foreground">{product.location}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(product.price)}
                        </TableCell>
                        <TableCell>
                          {product.stock_quantity !== null
                            ? product.stock_quantity
                            : "Unlimited"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_active ? "default" : "secondary"}>
                            {product.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActive(product)}
                            >
                              {product.is_active ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDialog(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Product</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{product.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(product.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ManageProducts;

