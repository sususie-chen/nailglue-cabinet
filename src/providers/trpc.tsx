import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";  // 关键改动：从 httpBatchLink 换成 httpLink
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../server/router";
import type { ReactNode } from "react";
import { useState } from "react";

export const trpc = createTRPCReact<AppRouter>();

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nail_auth_token");
}

function getBaseUrl() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "https://nailglue-cabinet.vercel.app";
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1 },
          mutations: { retry: false },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpLink({  // 关键改动：httpBatchLink → httpLink
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
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
