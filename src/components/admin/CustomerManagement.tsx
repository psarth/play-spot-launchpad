import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { Search, UserX, UserCheck, Trash2, Eye } from "lucide-react";

interface Customer {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_suspended: boolean;
  created_at: string;
  bookings_count: number;
}

const CustomerManagement = () => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    try {
      // Get all customers (users with customer role)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "customer");

      if (!roles) return;

      const customerIds = roles.map(r => r.user_id);

      // Get profiles for these customers
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", customerIds);

      // Get booking counts
      const { data: bookings } = await supabase
        .from("bookings")
        .select("customer_id");

      const bookingCounts: Record<string, number> = {};
      bookings?.forEach(b => {
        bookingCounts[b.customer_id] = (bookingCounts[b.customer_id] || 0) + 1;
      });

      // Combine data (we don't have email in profiles, so we'll use placeholder)
      const customerData: Customer[] = (profiles || []).map(p => ({
        id: p.id,
        email: `user_${p.id.slice(0, 8)}@sportspot.com`,
        full_name: p.full_name || "Unknown",
        phone: p.phone,
        is_suspended: p.is_suspended || false,
        created_at: p.created_at,
        bookings_count: bookingCounts[p.id] || 0,
      }));

      setCustomers(customerData);
      setFilteredCustomers(customerData);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery) {
      setFilteredCustomers(customers);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = customers.filter(
      c =>
        c.full_name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query)
    );
    setFilteredCustomers(filtered);
  };

  const toggleSuspension = async (customerId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: !currentStatus })
      .eq("id", customerId);

    if (error) {
      toast({ title: "Error updating user", variant: "destructive" });
    } else {
      toast({ title: currentStatus ? "User unblocked" : "User blocked" });
      fetchCustomers();
    }
  };

  const deleteCustomer = async (customerId: string) => {
    // Delete from profiles (cascade will handle related data)
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", customerId);

    if (error) {
      toast({ title: "Error deleting user", variant: "destructive" });
    } else {
      toast({ title: "User deleted successfully" });
      fetchCustomers();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Customer Management</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No customers found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{customer.full_name}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{customer.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{customer.bookings_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.is_suspended ? "destructive" : "default"}>
                        {customer.is_suspended ? "Suspended" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(customer.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSuspension(customer.id, customer.is_suspended)}
                        >
                          {customer.is_suspended ? (
                            <UserCheck className="h-4 w-4" />
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this customer? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteCustomer(customer.id)}>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerManagement;