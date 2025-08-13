import { useState, useMemo } from "react";
import { ChevronRight, ChevronDown, Copy, Check, Hash, Quote, ToggleLeft, FileX } from "lucide-react";
import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: any;
  className?: string;
}

interface JsonNodeProps {
  data: any;
  keyName?: string;
  level?: number;
  isArrayItem?: boolean;
  isLast?: boolean;
}

function JsonNode({ data, keyName, level = 0, isArrayItem = false, isLast = true }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  
  const indent = level * 20;

  // Handle primitive values
  if (data === null) {
    return (
      <div className="flex items-center py-1" style={{ paddingLeft: indent }}>
        {keyName && !isArrayItem && (
          <>
            <span className="text-blue-600 font-semibold mr-2">"{keyName}":</span>
          </>
        )}
        <div className="flex items-center">
          <FileX className="w-3 h-3 text-gray-400 mr-1" />
          <span className="text-gray-500 italic">null</span>
        </div>
      </div>
    );
  }

  if (typeof data === 'boolean') {
    return (
      <div className="flex items-center py-1" style={{ paddingLeft: indent }}>
        {keyName && !isArrayItem && (
          <>
            <span className="text-blue-600 font-semibold mr-2">"{keyName}":</span>
          </>
        )}
        <div className="flex items-center">
          <ToggleLeft className="w-3 h-3 text-purple-500 mr-1" />
          <span className="text-purple-600 font-medium">{data.toString()}</span>
        </div>
      </div>
    );
  }

  if (typeof data === 'number') {
    return (
      <div className="flex items-center py-1" style={{ paddingLeft: indent }}>
        {keyName && !isArrayItem && (
          <>
            <span className="text-blue-600 font-semibold mr-2">"{keyName}":</span>
          </>
        )}
        <div className="flex items-center">
          <Hash className="w-3 h-3 text-orange-500 mr-1" />
          <span className="text-orange-600 font-medium">{data}</span>
        </div>
      </div>
    );
  }

  if (typeof data === 'string') {
    return (
      <div className="flex items-center py-1" style={{ paddingLeft: indent }}>
        {keyName && !isArrayItem && (
          <>
            <span className="text-blue-600 font-semibold mr-2">"{keyName}":</span>
          </>
        )}
        <div className="flex items-center">
          <Quote className="w-3 h-3 text-green-500 mr-1" />
          <span className="text-green-600">"{data}"</span>
        </div>
      </div>
    );
  }

  // Handle arrays and objects
  const isArray = Array.isArray(data);
  const isObject = typeof data === 'object' && !isArray;
  
  if (!isArray && !isObject) return null;

  const entries = isArray ? data : Object.entries(data);
  const itemCount = isArray ? data.length : Object.keys(data).length;
  const containerType = isArray ? 'Array' : 'Object';
  const brackets = isArray ? ['[', ']'] : ['{', '}'];

  return (
    <div>
      {/* Container header */}
      <div 
        className="flex items-center py-1 cursor-pointer hover:bg-slate-50 rounded transition-colors"
        style={{ paddingLeft: indent }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center mr-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </div>
        
        {keyName && !isArrayItem && (
          <span className="text-blue-600 font-semibold mr-2">"{keyName}":</span>
        )}
        
        <span className="text-gray-600 font-medium mr-2">{brackets[0]}</span>
        
        {!isExpanded && (
          <span className="text-gray-500 text-sm">
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </span>
        )}
        
        {!isExpanded && (
          <span className="text-gray-600 font-medium ml-1">{brackets[1]}</span>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div>
          {isArray ? (
            data.map((item: any, index: number) => (
              <div key={index}>
                <div className="flex items-center text-gray-500 text-sm py-0.5" style={{ paddingLeft: indent + 20 }}>
                  <span className="w-8 text-right mr-2">[{index}]</span>
                </div>
                <JsonNode
                  data={item}
                  level={level + 1}
                  isArrayItem={true}
                  isLast={index === data.length - 1}
                />
              </div>
            ))
          ) : (
            Object.entries(data).map(([key, value], index) => (
              <JsonNode
                key={key}
                data={value}
                keyName={key}
                level={level + 1}
                isLast={index === Object.entries(data).length - 1}
              />
            ))
          )}
          
          {/* Closing bracket */}
          <div className="flex items-center py-1" style={{ paddingLeft: indent }}>
            <span className="text-gray-600 font-medium">{brackets[1]}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function JsonViewer({ data, className }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  // Always convert to JSON string first to ensure we have the complete API response
  const jsonString = useMemo(() => {
    return JSON.stringify(data, null, 4);
  }, [data]);

  // Parse the JSON string back to object for rendering the collapsible view
  const parsedData = useMemo(() => {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return data; // fallback to original data if parsing fails
    }
  }, [jsonString, data]);

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
      {/* Header with Copy Button */}
      <div className="bg-white border border-gray-200 rounded-t-lg px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-gray-700 font-medium">JSON Response</span>
          <span className="text-gray-500 text-sm">
            ({typeof parsedData === 'object' && parsedData !== null ? 
              Array.isArray(parsedData) ? `${parsedData.length} items` : `${Object.keys(parsedData).length} properties`
              : 'primitive'})
          </span>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors text-sm font-medium border border-blue-200"
          title="Copy entire JSON"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-1" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              Copy JSON
            </>
          )}
        </button>
      </div>

      {/* JSON Content */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-lg shadow-sm">
        <div className="p-4 max-h-96 overflow-auto bg-gradient-to-br from-gray-50 to-white">
          <JsonNode data={parsedData} />
        </div>
      </div>

      {/* Copy Success Message */}
      {copied && (
        <div className="absolute top-16 right-4 bg-green-100 border border-green-200 text-green-800 px-3 py-2 rounded-md text-sm z-10 shadow-lg">
          <div className="flex items-center">
            <Check className="w-4 h-4 mr-1" />
            Copied to clipboard!
          </div>
        </div>
      )}
    </div>
  );
}
