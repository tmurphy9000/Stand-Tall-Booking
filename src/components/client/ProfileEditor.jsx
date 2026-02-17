import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Camera, User, Star, Package, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export default function ProfileEditor({ client, open, onClose }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(client?.photo_url || "");
  const [preferredBarbers, setPreferredBarbers] = useState(client?.preferred_barber_ids || []);
  const [preferredServices, setPreferredServices] = useState(client?.preferred_service_ids || []);
  const [preferredBrands, setPreferredBrands] = useState(client?.preferred_brands || []);
  const [newBrand, setNewBrand] = useState("");

  const { data: barbers = [] } = useQuery({
    queryKey: ["barbers"],
    queryFn: () => base44.entities.Barber.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => base44.entities.Service.list(),
  });

  const updateClient = useMutation({
    mutationFn: (data) => base44.entities.Client.update(client.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client"] });
      toast.success("Profile updated!");
      onClose();
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPhotoUrl(file_url);
      toast.success("Photo uploaded!");
    } catch (error) {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const toggleBarber = (barberId) => {
    setPreferredBarbers(prev =>
      prev.includes(barberId) ? prev.filter(id => id !== barberId) : [...prev, barberId]
    );
  };

  const toggleService = (serviceId) => {
    setPreferredServices(prev =>
      prev.includes(serviceId) ? prev.filter(id => id !== serviceId) : [...prev, serviceId]
    );
  };

  const addBrand = () => {
    if (newBrand.trim() && !preferredBrands.includes(newBrand.trim())) {
      setPreferredBrands([...preferredBrands, newBrand.trim()]);
      setNewBrand("");
    }
  };

  const removeBrand = (brand) => {
    setPreferredBrands(preferredBrands.filter(b => b !== brand));
  };

  const handleSave = () => {
    updateClient.mutate({
      photo_url: photoUrl,
      preferred_barber_ids: preferredBarbers,
      preferred_service_ids: preferredServices,
      preferred_brands: preferredBrands,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile & Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#C9A94E]/20 flex items-center justify-center">
                  <User className="w-12 h-12 text-[#C9A94E]" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#C9A94E] flex items-center justify-center cursor-pointer hover:bg-[#A07D2B] transition">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {uploading && <Loader2 className="w-4 h-4 animate-spin text-[#C9A94E]" />}
          </div>

          {/* Preferred Barbers */}
          <Card>
            <CardContent className="pt-6">
              <Label className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4" /> Preferred Barbers
              </Label>
              <div className="space-y-2">
                {barbers.filter(b => b.is_active).map(barber => (
                  <div key={barber.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={preferredBarbers.includes(barber.id)}
                      onCheckedChange={() => toggleBarber(barber.id)}
                    />
                    <label className="text-sm cursor-pointer flex-1">
                      {barber.name} <span className="text-gray-400">({barber.tier})</span>
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preferred Services */}
          <Card>
            <CardContent className="pt-6">
              <Label className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4" /> Preferred Services
              </Label>
              <div className="space-y-2">
                {services.filter(s => s.is_active).map(service => (
                  <div key={service.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={preferredServices.includes(service.id)}
                      onCheckedChange={() => toggleService(service.id)}
                    />
                    <label className="text-sm cursor-pointer flex-1">
                      {service.name} <span className="text-gray-400">(${service.price})</span>
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Preferred Brands */}
          <Card>
            <CardContent className="pt-6">
              <Label className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4" /> Preferred Product Brands
              </Label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="Add brand name..."
                    onKeyPress={(e) => e.key === "Enter" && addBrand()}
                  />
                  <Button onClick={addBrand} size="sm" className="bg-[#C9A94E] hover:bg-[#A07D2B]">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {preferredBrands.map(brand => (
                    <span
                      key={brand}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-2"
                    >
                      {brand}
                      <button onClick={() => removeBrand(brand)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-[#C9A94E] hover:bg-[#A07D2B]"
              disabled={updateClient.isPending}
            >
              {updateClient.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}