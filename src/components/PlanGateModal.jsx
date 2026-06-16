import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle } from "lucide-react";

/**
 * Generic upgrade-wall modal.
 *
 * Props:
 *   open        – boolean
 *   onClose     – () => void
 *   feature     – 'barbers' | 'locations' (drives the copy)
 *   planName    – e.g. 'Basic'
 *   limit       – number (the current plan's limit)
 */
export default function PlanGateModal({ open, onClose, feature, planName, limit }) {
  const featureLabel = feature === 'barbers' ? 'barber' : 'location';
  const featureLabelPlural = feature === 'barbers' ? 'barbers' : 'locations';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
              <ArrowUpCircle className="w-5 h-5 text-amber-500" />
            </div>
            <DialogTitle className="text-base">
              {planName} plan limit reached
            </DialogTitle>
          </div>
        </DialogHeader>

        <p className="text-sm text-gray-600 leading-relaxed">
          You've reached the {featureLabel} limit for your{' '}
          <span className="font-semibold text-gray-800">{planName}</span> plan
          ({limit} {featureLabelPlural}). Upgrade your plan to add more{' '}
          {featureLabelPlural}.
        </p>

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white"
            onClick={() => { window.location.href = "/Settings?tab=subscription"; }}
          >
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Upgrade Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
