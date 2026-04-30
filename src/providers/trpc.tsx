import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
    mutations: { retry: false },
  },
});

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nail_auth_token");
}

// 动态获取 Base URL
function getBaseUrl() {
  if (typeof window !== "undefined") {
    // 如果是在浏览器里跑 Vercel 域名，用相对路径
    if (!window.location.hostname.includes("localhost")) return "";
  }
  // 这里的地址必须是你 Vercel 的线上真实域名
  return "https://nailglue-cabinet.vercel.app";
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`, 
      transformer: superjson,
      headers() {
        const token = getAuthToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
