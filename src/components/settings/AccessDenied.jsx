import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle } from "lucide-react";

export default function AccessDenied() {
  return (
    <Card className="max-w-md mx-auto mt-8 border-red-200">
      <CardContent className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-red-600 mb-2">Access Denied</h3>
        <p className="text-sm text-gray-600">
          You don't have permission to view this information.
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Contact an owner or manager for access.
        </p>
      </CardContent>
    </Card>
  );
}