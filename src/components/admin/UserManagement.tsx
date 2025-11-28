import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  is_creator: boolean;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: 'admin' | 'artisan' | 'creator' | 'educator' | 'employer' | 'event_organizer' | 'freelancer' | 'journalist' | 'lodging' | 'moderator' | 'restaurant' | 'seller' | 'user';
}

export function UserManagement() {
  const { t } = useTranslation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      setProfiles(profilesData || []);
      
      const rolesMap: Record<string, string> = {};
      rolesData?.forEach((role: UserRole) => {
        rolesMap[role.user_id] = role.role;
      });
      setUserRoles(rolesMap);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'artisan' | 'creator' | 'educator' | 'employer' | 'event_organizer' | 'freelancer' | 'journalist' | 'lodging' | 'moderator' | 'restaurant' | 'seller' | 'user') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: newRole });

      if (error) throw error;

      setUserRoles(prev => ({ ...prev, [userId]: newRole }));
      
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update user role",
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
        <CardTitle>User Management</CardTitle>
        <CardDescription>Manage user accounts and roles</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell className="font-medium">{profile.display_name}</TableCell>
                <TableCell>
                  <Badge variant={profile.is_creator ? "default" : "secondary"}>
                    {profile.is_creator ? (
                      <><Shield className="mr-1 h-3 w-3" /> Creator</>
                    ) : (
                      <><User className="mr-1 h-3 w-3" /> User</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={userRoles[profile.user_id] || 'user'}
                    onValueChange={(value: 'admin' | 'artisan' | 'creator' | 'educator' | 'employer' | 'event_organizer' | 'freelancer' | 'journalist' | 'lodging' | 'moderator' | 'restaurant' | 'seller' | 'user') => 
                      updateUserRole(profile.user_id, value)
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="creator">Creator</SelectItem>
                      <SelectItem value="seller">Seller</SelectItem>
                      <SelectItem value="lodging">Lodging</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="educator">Educator</SelectItem>
                      <SelectItem value="freelancer">Freelancer</SelectItem>
                      <SelectItem value="journalist">Journalist</SelectItem>
                      <SelectItem value="artisan">Artisan</SelectItem>
                      <SelectItem value="employer">Employer</SelectItem>
                      <SelectItem value="event_organizer">Event Organizer</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  {new Date(profile.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    {t("common.viewDetails")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
