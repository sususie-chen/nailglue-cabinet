import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "@hono/node-server/vercel";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/router";

const app = new Hono();

// CORS —— 解决你刚才遇到的跨域报错
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      // 允许 Vercel 所有 preview 域名 + 本地开发
      if (
        origin.includes("vercel.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return origin;
      }
      // 生产域名兜底
      return "https://nailglue-cabinet.vercel.app";
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// tRPC 路由 —— 所有 /api/trpc/* 的请求都进这里
app.all("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => ({}),
  });
});

// 健康检查，方便你验证后端是否活着
app.get("/api/health", (c) =>
  c.json({ status: "ok", time: new Date().toISOString() })
);

// Vercel Node.js 运行时适配
export default handle(app);
