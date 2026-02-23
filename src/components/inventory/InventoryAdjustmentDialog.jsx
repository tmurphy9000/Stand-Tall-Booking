import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus } from "lucide-react";

export default function InventoryAdjustmentDialog({ open, onClose, product, onSave }) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState(null);
  const [notes, setNotes] = useState("");
  const [type, setType] = useState(null);

  const handleSubmit = () => {
    if (!type || !reason || !quantity || quantity <= 0) return;
    onSave({
      type,
      reason,
      quantity: parseInt(quantity),
      notes
    });
    setQuantity("");
    setReason(null);
    setNotes("");
    setType(null);
  };

  const handleClose = () => {
    setQuantity("");
    setReason(null);
    setNotes("");
    setType(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Inventory - {product?.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {/* Type Selection */}
          {!type && (
            <div className="flex gap-2">
              <Button
                onClick={() => setType("add")}
                className="flex-1 h-20 bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200"
                variant="outline"
              >
                <div className="flex flex-col items-center gap-1">
                  <Plus className="w-6 h-6" />
                  <span className="font-medium">Add Inventory</span>
                </div>
              </Button>
              <Button
                onClick={() => setType("subtract")}
                className="flex-1 h-20 bg-red-50 hover:bg-red-100 text-red-700 border-2 border-red-200"
                variant="outline"
              >
                <div className="flex flex-col items-center gap-1">
                  <Minus className="w-6 h-6" />
                  <span className="font-medium">Subtract Inventory</span>
                </div>
              </Button>
            </div>
          )}

          {type && (
            <>
              {/* Quantity Input */}
              <div>
                <Label className="text-sm">Quantity</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  min="1"
                />
              </div>

              {/* Reason Selection */}
              <div>
                <Label className="text-sm">Reason</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {type === "add" ? (
                    <>
                      <Button
                        onClick={() => setReason("return")}
                        variant={reason === "return" ? "default" : "outline"}
                        className="h-auto py-3"
                      >
                        Return
                      </Button>
                      <Button
                        onClick={() => setReason("received_new_order")}
                        variant={reason === "received_new_order" ? "default" : "outline"}
                        className="h-auto py-3"
                      >
                        Received New Order
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => setReason("lost")}
                        variant={reason === "lost" ? "default" : "outline"}
                        className="h-auto py-3"
                      >
                        Lost
                      </Button>
                      <Button
                        onClick={() => setReason("damaged")}
                        variant={reason === "damaged" ? "default" : "outline"}
                        className="h-auto py-3"
                      >
                        Damaged
                      </Button>
                      <Button
                        onClick={() => setReason("stolen")}
                        variant={reason === "stolen" ? "default" : "outline"}
                        className="h-auto py-3"
                      >
                        Stolen
                      </Button>
                      <Button
                        onClick={() => setReason("business_use")}
                        variant={reason === "business_use" ? "default" : "outline"}
                        className="h-auto py-3"
                      >
                        Business Use
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-sm">Notes (Optional)</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add any additional details..."
                  className="h-20"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          {type && (
            <>
              <Button variant="ghost" onClick={() => setType(null)}>Back</Button>
              <Button
                onClick={handleSubmit}
                disabled={!reason || !quantity || quantity <= 0}
                className={type === "add" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              >
                Confirm {type === "add" ? "Add" : "Subtract"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}