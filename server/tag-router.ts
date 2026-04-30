import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { tags } from "@db/schema";

export const tagRouter = createRouter({
  // 列出用户所有标签
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    return db
      .select()
      .from(tags)
      .where(eq(tags.userId, userId));
  }),

  // 创建标签
  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["color", "function"]),
        colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const [newTag] = await db.insert(tags).values({
        userId,
        name: input.name,
        type: input.type,
        colorHex: input.colorHex || null,
      });

      return { id: Number(newTag.insertId), ...input, userId };
    }),

  // 删除标签
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      await db
        .delete(tags)
        .where(and(eq(tags.id, input.id), eq(tags.userId, userId)));

      return { success: true };
    }),
});
