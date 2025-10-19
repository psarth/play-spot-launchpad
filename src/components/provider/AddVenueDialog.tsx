import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Sport {
  id: string;
  name: string;
}

interface AddVenueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddVenueDialog = ({ open, onOpenChange, onSuccess }: AddVenueDialogProps) => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    address: "",
    sport_id: "",
    price_per_hour: "",
    amenities: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSports();
    }
  }, [open]);

  const fetchSports = async () => {
    const { data } = await supabase
      .from("sports")
      .select("*")
      .order("name");

    if (data) setSports(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const amenitiesArray = formData.amenities
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a);

    const { error } = await supabase.from("venues").insert({
      provider_id: user.id,
      name: formData.name,
      description: formData.description || null,
      location: formData.location,
      address: formData.address || null,
      sport_id: formData.sport_id,
      price_per_hour: parseFloat(formData.price_per_hour),
      amenities: amenitiesArray.length > 0 ? amenitiesArray : null,
    });

    if (error) {
      toast({ title: "Error adding venue", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Venue added successfully" });
      setFormData({
        name: "",
        description: "",
        location: "",
        address: "",
        sport_id: "",
        price_per_hour: "",
        amenities: "",
      });
      onOpenChange(false);
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Venue</DialogTitle>
          <DialogDescription>Fill in the details to add a new venue</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Venue Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="sport">Sport *</Label>
            <Select
              value={formData.sport_id}
              onValueChange={(value) => setFormData({ ...formData, sport_id: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sport" />
              </SelectTrigger>
              <SelectContent>
                {sports.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id}>
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Mumbai, Delhi"
              required
            />
          </div>

          <div>
            <Label htmlFor="address">Full Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Complete address with pincode"
            />
          </div>

          <div>
            <Label htmlFor="price">Price per Hour (₹) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price_per_hour}
              onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your venue..."
            />
          </div>

          <div>
            <Label htmlFor="amenities">Amenities (comma separated)</Label>
            <Input
              id="amenities"
              value={formData.amenities}
              onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
              placeholder="e.g., Parking, Changing Room, Water"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Venue"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddVenueDialog;
