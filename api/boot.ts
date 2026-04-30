import { Hono } from "hono";
import { cors } from "hono/cors";
import { handle } from "hono/vercel"; // 必须引入这个适配器
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/router";
import { createContext } from "../server/context";

const app = new Hono().basePath("/api"); // 明确基础路径

app.use("*", cors());

// 这里的路径要和 basePath 配合，匹配 /api/trpc/*
app.all("/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext(c.req.raw),
  });
});

app.get("/health", (c) => c.json({ status: "ok" }));

// 导出 Vercel 要求的处理函数
export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);

export default handle(app);
