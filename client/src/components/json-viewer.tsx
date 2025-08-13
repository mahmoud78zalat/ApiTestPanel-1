import { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: any;
  className?: string;
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  const jsonString = useMemo(() => {
    return JSON.stringify(data, null, 4);
  }, [data]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 z-10 p-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors border border-slate-600"
        title="Copy JSON"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-slate-300" />
        )}
      </button>

      {/* Raw JSON Display */}
      <div className="json-viewer bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
        <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
          <span className="text-slate-300 text-sm font-medium">Raw JSON Response</span>
        </div>
        <div className="relative">
          <pre className="p-4 text-sm font-mono text-slate-100 overflow-auto max-h-96 whitespace-pre-wrap">
            <code className="text-slate-100">{jsonString}</code>
          </pre>
        </div>
      </div>

      {/* Copy Success Message */}
      {copied && (
        <div className="absolute top-12 right-3 bg-green-600 text-white px-3 py-1 rounded text-sm z-10 shadow-lg">
          Copied to clipboard!
        </div>
      )}
    </div>
  );
}
