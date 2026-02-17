import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileText, Edit2, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function ClientNotesCard({ client }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(client?.staff_notes || "");

  const updateNotes = useMutation({
    mutationFn: (data) => base44.entities.Client.update(client.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client"] });
      toast.success("Notes updated!");
      setIsEditing(false);
    },
  });

  const handleSave = async () => {
    updateNotes.mutate({ staff_notes: notes });
    
    // Send notification to admins about note update
    if (client?.email) {
      try {
        const users = await base44.entities.User.list();
        const admins = users.filter(u => u.role === 'admin');
        
        for (const admin of admins) {
          await base44.functions.invoke('sendNotification', {
            recipient_email: admin.email,
            recipient_type: 'staff',
            type: 'client_note_added',
            title: 'Client Note Updated',
            message: `Notes updated for client: ${client.name}\n\nEmail: ${client.email}`,
            client_id: client.id
          });
        }
      } catch (error) {
        console.error("Failed to send notification:", error);
      }
    }
  };

  const handleCancel = () => {
    setNotes(client?.staff_notes || "");
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Staff Notes
          </CardTitle>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about hair type, allergies, previous styles, preferences..."
              rows={6}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateNotes.isPending}
                className="flex-1 bg-[#C9A94E] hover:bg-[#A07D2B]"
              >
                <Save className="w-4 h-4 mr-1" />
                {updateNotes.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 whitespace-pre-wrap min-h-[60px]">
            {client?.staff_notes || (
              <span className="text-gray-400 italic">
                No notes yet. Click edit to add information about this client.
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}