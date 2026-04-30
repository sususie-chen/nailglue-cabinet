import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { recognitionRecords } from "@db/schema";


export const recognitionRouter = createRouter({
  // 列出用户的识别记录
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    return db
      .select()
      .from(recognitionRecords)
      .where(eq(recognitionRecords.userId, userId));
  }),

  // 创建识别记录
  create: authedQuery
    .input(
      z.object({
        imageData: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const [record] = await db.insert(recognitionRecords).values({
        userId,
        imageData: input.imageData,
        status: "completed",
      });

      return { id: Number(record.insertId), ...input, userId };
    }),

  // 更新识别结果
  updateResult: authedQuery
    .input(
      z.object({
        id: z.number(),
        result: z.array(
          z.object({
            id: z.string(),
            imageData: z.string(),
            brand: z.string(),
            shadeCode: z.string(),
            shadeName: z.string().optional(),
            isNailPolish: z.boolean(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      await db
        .update(recognitionRecords)
        .set({
          result: JSON.stringify(input.result),
          status: "completed",
        })
        .where(
          and(
            eq(recognitionRecords.id, input.id),
            eq(recognitionRecords.userId, userId)
          )
        );

      return { success: true };
    }),

  // 删除识别记录
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      await db
        .delete(recognitionRecords)
        .where(
          and(
            eq(recognitionRecords.id, input.id),
            eq(recognitionRecords.userId, userId)
          )
        );

      return { success: true };
    }),
});
