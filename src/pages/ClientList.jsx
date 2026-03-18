import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User, Phone, Mail, Star, Plus, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { usePermissions } from "../components/permissions/usePermissions";
import AddClientDialog from "../components/client/AddClientDialog";
import { toast } from "sonner";

export default function ClientList() {
  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { hasFullAccess } = usePermissions();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-last_visit"),
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => base44.entities.Review.list(),
  });

  const createClient = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowAddDialog(false);
      toast.success("Client added successfully");
    },
  });

  const filteredClients = clients.filter(c => {
    const searchLower = search.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(searchLower);
    if (!hasFullAccess) return nameMatch;
    return nameMatch ||
      c.email?.toLowerCase().includes(searchLower) ||
      c.phone?.toLowerCase().includes(searchLower);
  });

  const getClientRating = (clientId) => {
    const clientReviews = reviews.filter(r => r.client_id === clientId);
    if (clientReviews.length === 0) return null;
    const avg = clientReviews.reduce((sum, r) => sum + r.rating, 0) / clientReviews.length;
    return avg.toFixed(1);
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Link to={createPageUrl("Calendar")}>
              <Button variant="ghost" size="icon" className="mt-1">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold mb-2">Clients</h1>
              <p className="text-gray-600 text-sm">Manage and view all clients</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-[#8B9A7E] hover:bg-[#6B7A5E] gap-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={hasFullAccess ? "Search clients by name, email, or phone..." : "Search clients by name..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-3">
          {filteredClients.map(client => {
            const rating = getClientRating(client.id);
            return (
              <Link key={client.id} to={`${createPageUrl("ClientDetails")}?id=${client.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {client.photo_url ? (
                          <img src={client.photo_url} alt={client.name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                            <User className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{client.name}</p>
                          {hasFullAccess && (
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {client.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {client.email}
                                </span>
                              )}
                              {client.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {client.phone}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-lg">{client.total_visits || 0}</p>
                          <p className="text-xs text-gray-500">Visits</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">${(client.total_spent || 0).toFixed(0)}</p>
                          <p className="text-xs text-gray-500">Spent</p>
                        </div>
                        {rating && (
                          <div className="flex items-center gap-1 text-yellow-600">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-semibold">{rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">No clients found</p>
            </CardContent>
          </Card>
        )}
      </div>

      <AddClientDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSave={(data) => createClient.mutate(data)}
      />
    </div>
  );
}