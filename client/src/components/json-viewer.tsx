import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: any;
  className?: string;
}

interface JsonNodeProps {
  data: any;
  keyName?: string;
  level?: number;
  isLast?: boolean;
  onCopy?: (value: string) => void;
}

function JsonNode({ data, keyName, level = 0, isLast = true, onCopy }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (value: any) => {
    try {
      const textToCopy = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      onCopy?.(textToCopy);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const renderValue = (value: any) => {
    if (value === null) {
      return <span className="text-slate-400 italic">null</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-red-500 font-medium">{value.toString()}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-amber-500">{value}</span>;
    }
    
    if (typeof value === 'string') {
      return <span className="text-emerald-500">"{value}"</span>;
    }

    return null;
  };

  const isObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  const isArray = Array.isArray(data);
  const isPrimitive = !isObject && !isArray;

  if (isPrimitive) {
    return (
      <div className="flex items-center group">
        {keyName && (
          <>
            <span className="text-purple-400 font-medium">"{keyName}"</span>
            <span className="text-slate-400 mx-2">:</span>
          </>
        )}
        {renderValue(data)}
        <button
          onClick={() => handleCopy(data)}
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3 text-slate-400" />
          )}
        </button>
      </div>
    );
  }

  const entries = isArray ? data.map((item: any, index: number) => [index, item]) : Object.entries(data);
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  return (
    <div>
      <div className="flex items-center group">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center hover:bg-slate-700 rounded p-1 -ml-1"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>
        
        {keyName && (
          <>
            <span className="text-purple-400 font-medium">"{keyName}"</span>
            <span className="text-slate-400 mx-2">:</span>
          </>
        )}
        
        <span className="text-slate-400 font-semibold">{openBracket}</span>
        
        {!isExpanded && (
          <span className="text-slate-500 ml-1">
            {entries.length} item{entries.length !== 1 ? 's' : ''}
          </span>
        )}
        
        <button
          onClick={() => handleCopy(data)}
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-700 rounded"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3 text-slate-400" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="ml-6 border-l border-slate-700 pl-4 mt-1">
          {entries.map(([key, value], index) => (
            <div key={key} className="mb-1">
              <JsonNode
                data={value}
                keyName={isArray ? undefined : key}
                level={level + 1}
                isLast={index === entries.length - 1}
                onCopy={onCopy}
              />
            </div>
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="flex items-center">
          <span className="text-slate-400 font-semibold">{closeBracket}</span>
          {!isLast && <span className="text-slate-400">,</span>}
        </div>
      )}
    </div>
  );
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  const [copiedMessage, setCopiedMessage] = useState<string>("");

  const handleCopy = (value: string) => {
    setCopiedMessage("Copied to clipboard!");
    setTimeout(() => setCopiedMessage(""), 2000);
  };

  const jsonString = useMemo(() => {
    return JSON.stringify(data, null, 2);
  }, [data]);

  return (
    <div className={cn("relative", className)}>
      {copiedMessage && (
        <div className="absolute top-2 right-2 bg-green-600 text-white px-3 py-1 rounded text-sm z-10">
          {copiedMessage}
        </div>
      )}
      <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm text-slate-100 overflow-auto max-h-96">
        <JsonNode data={data} onCopy={handleCopy} />
      </div>
    </div>
  );
}
