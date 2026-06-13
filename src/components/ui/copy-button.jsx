import React from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export function CopyButton({ value, label = "Copied!", className = "" }) {
  if (!value) return null;

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy"
      className={`text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ${className}`}
    >
      <Copy className="w-3.5 h-3.5" />
    </button>
  );
}
