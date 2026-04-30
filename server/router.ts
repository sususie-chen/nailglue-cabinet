import { authRouter } from "./auth-router";
import { productRouter } from "./product-router";
import { tagRouter } from "./tag-router";
import { recognitionRouter } from "./recognition-router";
import { ocrRouter } from "./ocr-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  product: productRouter,
  tag: tagRouter,
  recognition: recognitionRouter,
  ocr: ocrRouter,
});

export type AppRouter = typeof appRouter;
