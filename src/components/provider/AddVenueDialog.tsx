import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";

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
    venue_notes: "",
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      toast({ title: "Maximum 5 images allowed", variant: "destructive" });
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({ title: `${file.name} is not a valid image type`, variant: "destructive" });
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: `${file.name} is too large (max 5MB)`, variant: "destructive" });
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);
    
    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (venueId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const file of images) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${venueId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('venue-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('venue-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: "Venue name is required", variant: "destructive" });
      return;
    }
    if (!formData.location.trim()) {
      toast({ title: "Location is required", variant: "destructive" });
      return;
    }
    if (!formData.sport_id) {
      toast({ title: "Please select a sport", variant: "destructive" });
      return;
    }
    if (!formData.price_per_hour || parseFloat(formData.price_per_hour) <= 0) {
      toast({ title: "Please enter a valid price", variant: "destructive" });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please login to add venue", variant: "destructive" });
      setLoading(false);
      return;
    }

    const amenitiesArray = formData.amenities
      .split(",")
      .map((a) => a.trim())
      .filter((a) => a);

    // First create the venue to get the ID
    const { data: venueData, error } = await supabase.from("venues").insert({
      provider_id: user.id,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      location: formData.location.trim(),
      address: formData.address.trim() || null,
      sport_id: formData.sport_id,
      price_per_hour: parseFloat(formData.price_per_hour),
      amenities: amenitiesArray.length > 0 ? amenitiesArray : null,
      venue_notes: formData.venue_notes.trim() || null,
      verification_status: 'pending',
      is_verified: false,
    }).select().single();

    if (error) {
      toast({ title: "Error adding venue", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Upload images if any
    if (images.length > 0 && venueData) {
      setUploadingImages(true);
      const uploadedUrls = await uploadImages(venueData.id);
      
      if (uploadedUrls.length > 0) {
        await supabase.from("venues")
          .update({ images: uploadedUrls })
          .eq('id', venueData.id);
      }
      setUploadingImages(false);
    }

    toast({ 
      title: "Venue added successfully!", 
      description: "Your venue is pending admin verification." 
    });
    
    // Reset form
    setFormData({
      name: "",
      description: "",
      location: "",
      address: "",
      sport_id: "",
      price_per_hour: "",
      amenities: "",
      venue_notes: "",
    });
    setImages([]);
    setImagePreview([]);
    onOpenChange(false);
    onSuccess();
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Venue</DialogTitle>
          <DialogDescription>Fill in the details to add a new venue. Your venue will be reviewed before going live.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Venue Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Elite Sports Arena"
                className="mt-1"
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
                <SelectTrigger className="mt-1">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">City/Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Mumbai, Delhi"
                className="mt-1"
                required
              />
            </div>

            <div>
              <Label htmlFor="price">Price per Hour (₹) *</Label>
              <Input
                id="price"
                type="number"
                min="1"
                step="1"
                value={formData.price_per_hour}
                onChange={(e) => setFormData({ ...formData, price_per_hour: e.target.value })}
                placeholder="e.g., 500"
                className="mt-1"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Full Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Complete address with landmark and pincode"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your venue, facilities, and what makes it special..."
              className="mt-1 min-h-[80px]"
            />
          </div>

          <div>
            <Label htmlFor="amenities">Amenities (comma separated)</Label>
            <Input
              id="amenities"
              value={formData.amenities}
              onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
              placeholder="e.g., Parking, Changing Room, Drinking Water, First Aid"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="venue_notes">Venue Rules & Notes</Label>
            <Textarea
              id="venue_notes"
              value={formData.venue_notes}
              onChange={(e) => setFormData({ ...formData, venue_notes: e.target.value })}
              placeholder="Any rules, parking info, equipment details, or other important notes for players..."
              className="mt-1 min-h-[80px]"
            />
          </div>

          {/* Image Upload */}
          <div>
            <Label>Venue Photos (Max 5)</Label>
            <div className="mt-2 border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageChange}
                className="hidden"
                id="venue-images"
              />
              <label htmlFor="venue-images" className="cursor-pointer block text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload images (JPEG, PNG, WebP)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 5MB per image
                </p>
              </label>
            </div>

            {/* Image Previews */}
            {imagePreview.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-3">
                {imagePreview.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingImages}>
              {loading || uploadingImages ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingImages ? "Uploading Images..." : "Adding Venue..."}
                </>
              ) : (
                "Add Venue"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddVenueDialog;
