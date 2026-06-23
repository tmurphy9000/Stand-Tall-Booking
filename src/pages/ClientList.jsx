import React, { useState, useRef, useEffect, useMemo } from "react";
import { entities } from "@/api/entities";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, User, Phone, Mail, Star, ArrowLeft, Download, Upload, FileDown, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { createPageUrl, formatPhoneNumber } from "../utils";
import { usePermissions } from "../components/permissions/usePermissions";
import { exportClientsToCSV, downloadClientImportTemplate } from "@/lib/clientCsv";
import ImportClientsDialog from "../components/clients/ImportClientsDialog";
import { CopyButton } from "@/components/ui/copy-button";

const PAGE_SIZE = 20;

export default function ClientList() {
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { hasPermission } = usePermissions();
  const canManageClients = hasPermission('clients.management');
  const loadMoreRef = useRef(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingClients,
  } = useInfiniteQuery({
    queryKey: ["clients", "browse"],
    queryFn: ({ pageParam = 0 }) => entities.Client.list("name", PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
    enabled: search.length === 0,
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["clients", "search", search, canManageClients],
    queryFn: () =>
      entities.Client.search(search, {
        columns: canManageClients ? ["name", "email", "phone"] : ["name"],
        sortField: "name",
      }),
    enabled: search.length > 0,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const allClients = await entities.Client.list("name");
      if (allClients.length === 0) {
        toast.error("No clients to export");
        return;
      }
      exportClientsToCSV(allClients);
      toast.success(`Exported ${allClients.length} clients`);
    } catch (err) {
      toast.error("Export failed", { description: err.message });
    } finally {
      setExporting(false);
    }
  };

  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => entities.Review.list(),
  });

  const browseClients = useMemo(() => data?.pages.flat() ?? [], [data]);
  const clients = search.length > 0 ? searchResults : browseClients;
  const isLoading = search.length > 0 ? isSearching : isLoadingClients;

  useEffect(() => {
    if (search.length > 0 || !hasNextPage) return;
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetchingNextPage) {
        fetchNextPage();
      }
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [search, hasNextPage, isFetchingNextPage, fetchNextPage]);

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
              <p className="text-muted-foreground text-sm">Manage and view all clients</p>
            </div>
          </div>

          {canManageClients && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadClientImportTemplate}>
                <FileDown className="w-4 h-4 mr-2" />
                Template
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export
              </Button>
            </div>
          )}
        </div>

        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={canManageClients ? "Search clients by name, email, or phone..." : "Search clients by name..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-3">
          {clients.map(client => {
            const rating = getClientRating(client.id);
            return (
              <Link key={client.id} to={`/ClientDetails?id=${client.id}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {client.photo_url ? (
                          <img src={client.photo_url} alt={client.name} className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted dark:bg-muted flex items-center justify-center">
                            <User className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{client.name}</p>
                          {canManageClients && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {client.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {client.email}
                                  <CopyButton value={client.email} />
                                </span>
                              )}
                              {client.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {formatPhoneNumber(client.phone)}
                                  <CopyButton value={formatPhoneNumber(client.phone)} />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {client.deposit_required && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-700">
                            Deposit Req.
                          </span>
                        )}
                        <div className="text-center">
                          <p className="font-bold text-lg">{client.total_visits || 0}</p>
                          <p className="text-xs text-muted-foreground">Visits</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">${(client.total_spent || 0).toFixed(0)}</p>
                          <p className="text-xs text-muted-foreground">Spent</p>
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

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && clients.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">No clients found</p>
            </CardContent>
          </Card>
        )}

        {search.length === 0 && (
          <div ref={loadMoreRef} className="flex items-center justify-center py-4">
            {isFetchingNextPage && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          </div>
        )}
      </div>

      {canManageClients && (
        <ImportClientsDialog open={importOpen} onOpenChange={setImportOpen} />
      )}
    </div>
  );
}
