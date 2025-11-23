import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

interface Portfolio {
  id: string;
  title: string;
  category: string;
  creator_id: string;
  is_featured: boolean;
  created_at: string;
  profiles: {
    display_name: string;
  };
}

export function ContentModeration() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select(`
          *,
          profiles!portfolios_creator_id_fkey(display_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPortfolios(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load portfolios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFeatured = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('portfolios')
        .update({ is_featured: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      setPortfolios(prev =>
        prev.map(p => (p.id === id ? { ...p, is_featured: !currentStatus } : p))
      );

      toast({
        title: "Success",
        description: `Portfolio ${!currentStatus ? 'featured' : 'unfeatured'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update portfolio",
        variant: "destructive",
      });
    }
  };

  const deletePortfolio = async (id: string) => {
    try {
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPortfolios(prev => prev.filter(p => p.id !== id));

      toast({
        title: "Success",
        description: "Portfolio deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete portfolio",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Moderation</CardTitle>
        <CardDescription>Review and manage creator portfolios</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Creator</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {portfolios.map((portfolio) => (
              <TableRow key={portfolio.id}>
                <TableCell className="font-medium">{portfolio.title}</TableCell>
                <TableCell>{portfolio.profiles?.display_name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{portfolio.category}</Badge>
                </TableCell>
                <TableCell>
                  {portfolio.is_featured ? (
                    <Badge className="bg-green-500">Featured</Badge>
                  ) : (
                    <Badge variant="secondary">Regular</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(portfolio.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFeatured(portfolio.id, portfolio.is_featured)}
                    >
                      {portfolio.is_featured ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Portfolio</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this portfolio? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePortfolio(portfolio.id)}>
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
      </CardContent>
    </Card>
  );
}
