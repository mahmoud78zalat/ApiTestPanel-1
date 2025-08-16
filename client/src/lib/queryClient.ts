import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const requestId = Math.random().toString(36).substr(2, 9);
  const startTime = performance.now();
  
  console.log("📡 QUERY CLIENT REQUEST", requestId);
  console.log("├─ Method:", method);
  console.log("├─ URL:", url);
  console.log("├─ Has Data:", !!data);
  if (data) {
    console.log("├─ Data:", JSON.stringify(data).substring(0, 300) + (JSON.stringify(data).length > 300 ? "..." : ""));
  }
  console.log("└─ Credentials: include");
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  const endTime = performance.now();
  const duration = Math.round(endTime - startTime);
  
  console.log("📨 QUERY CLIENT RESPONSE", requestId);
  console.log("├─ Status:", res.status, res.statusText);
  console.log("├─ Duration:", duration + "ms");
  console.log("├─ Headers:", Object.fromEntries(res.headers.entries()));
  console.log("└─ OK:", res.ok);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
