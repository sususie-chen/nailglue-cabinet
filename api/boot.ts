import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/router";
import { createContext } from "../server/context";

const app = new Hono();
app.use("*", cors());

// 直接匹配 /api/health，不加任何前缀
app.get("/api/health", (c) => c.json({ status: "ok", message: "Power on!" }));

// 匹配 tRPC
app.all("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext(c.req.raw),
  });
});

export default app;
