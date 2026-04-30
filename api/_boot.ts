import { Hono } from "hono";
import { cors } from "hono/cors";
import { getRequestListener } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/router";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      if (
        origin.includes("vercel.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return origin;
      }
      return "https://nailglue-cabinet.vercel.app";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// 终极诊断路由：不经过 tRPC，纯 Hono 处理 POST
app.post("/api/diag-post", async (c) => {
  try {
    const body = await c.req.json();
    return c.json({ ok: true, type: "hono-post", body });
  } catch (e) {
    return c.json({ ok: false, error: String(e) }, 400);
  }
});

// 原来的 tRPC 路由
app.all("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => Promise.resolve({} as any),
  });
});

app.get("/api/health", (c) =>
  c.json({ status: "ok", time: new Date().toISOString() })
);

export default getRequestListener(app.fetch);
