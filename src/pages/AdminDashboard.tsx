import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Trash2, UserCheck, UserX } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  profiles: {
    full_name: string;
    phone: string | null;
  } | null;
  user_roles: {
    role: string;
  }[];
}

const AdminDashboard = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin" as any)
      .single();

    if (error || !data) {
      toast({
        title: "Access Denied",
        description: "You need admin access to view this page",
        variant: "destructive",
      });
      navigate("/");
    } else {
      fetchUsers();
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    
    // Fetch all profiles with their associated user roles
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        phone,
        created_at
      `);

    if (profilesError) {
      toast({ title: "Error fetching users", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch user roles for all users
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Combine the data
    const usersData: UserData[] = profilesData.map((profile) => ({
      id: profile.id,
      email: "", // Email is not accessible from profiles table
      created_at: profile.created_at,
      profiles: {
        full_name: profile.full_name,
        phone: profile.phone,
      },
      user_roles: rolesData?.filter((r) => r.user_id === profile.id).map((r) => ({ role: r.role })) || [],
    }));

    setUsers(usersData);
    setFilteredUsers(usersData);
    setLoading(false);
  };

  const filterUsers = () => {
    if (!searchQuery) {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.profiles?.full_name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query) ||
            user.profiles?.phone?.includes(query)
        )
      );
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    // Delete user's bookings first
    await supabase.from("bookings").delete().eq("customer_id", deleteUserId);

    // Delete user's venues
    await supabase.from("venues").delete().eq("provider_id", deleteUserId);

    // Delete user's roles
    await supabase.from("user_roles").delete().eq("user_id", deleteUserId);

    // Delete user's profile
    const { error } = await supabase.from("profiles").delete().eq("id", deleteUserId);

    if (error) {
      toast({ title: "Error deleting user", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User deleted successfully" });
      fetchUsers();
    }

    setDeleteUserId(null);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage all registered users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {loading ? (
              <div className="text-center py-12">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No users found.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{user.profiles?.full_name || "No name"}</h3>
                          {user.profiles?.phone && (
                            <p className="text-sm text-muted-foreground">{user.profiles.phone}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Joined: {new Date(user.created_at).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {user.user_roles.map((role, index) => (
                              <Badge key={index} variant="secondary">
                                {role.role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteUserId(user.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account and all
              associated data including bookings and venues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;
