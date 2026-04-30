import { z } from "zod";
import { eq, and, like, inArray, sql } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products, tags, productTags } from "@db/schema";

export const productRouter = createRouter({
  // 列出用户所有产品，支持筛选
  list: authedQuery
    .input(
      z.object({
        brand: z.string().optional(),
        tagIds: z.array(z.number()).optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      let query = db.select().from(products).where(eq(products.userId, userId));

      if (input?.brand) {
        query = db.select().from(products).where(
          and(eq(products.userId, userId), like(products.brand, `%${input.brand}%`))
        );
      }

      if (input?.search) {
        const searchPattern = `%${input.search}%`;
        query = db.select().from(products).where(
          and(
            eq(products.userId, userId),
            sql`(${products.brand} LIKE ${searchPattern} OR ${products.shadeCode} LIKE ${searchPattern} OR ${products.shadeName} LIKE ${searchPattern})`
          )
        );
      }

      const productList = await query;

      // 如果按标签筛选，需要关联查询
      if (input?.tagIds && input.tagIds.length > 0) {
        const productIdsWithTags = await db
          .select({ productId: productTags.productId })
          .from(productTags)
          .where(inArray(productTags.tagId, input.tagIds));
        
        const validProductIds = productIdsWithTags.map(p => p.productId);
        return productList.filter(p => validProductIds.includes(p.id));
      }

      // 获取每个产品的标签
      const productIds = productList.map(p => p.id);
      if (productIds.length === 0) return [];

      const allProductTags = await db
        .select({
          productId: productTags.productId,
          tagId: productTags.tagId,
        })
        .from(productTags)
        .where(inArray(productTags.productId, productIds));

      const allTags = await db
        .select()
        .from(tags)
        .where(inArray(tags.id, allProductTags.map(pt => pt.tagId)));

      return productList.map(product => ({
        ...product,
        tagList: allProductTags
          .filter(pt => pt.productId === product.id)
          .map(pt => allTags.find(t => t.id === pt.tagId))
          .filter(Boolean),
      }));
    }),

  // 获取单个产品详情
  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const [product] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, input.id), eq(products.userId, userId)));

      if (!product) throw new Error("Product not found");

      const productTagList = await db
        .select({ tagId: productTags.tagId })
        .from(productTags)
        .where(eq(productTags.productId, product.id));

      const tagList = productTagList.length > 0
        ? await db.select().from(tags).where(inArray(tags.id, productTagList.map(pt => pt.tagId)))
        : [];

      return { ...product, tagList };
    }),

  // 创建产品
  create: authedQuery
    .input(
      z.object({
        brand: z.string().min(1),
        shadeCode: z.string().min(1),
        shadeName: z.string().optional(),
        colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#CCCCCC"),
        note: z.string().optional(),
        swatchImages: z.array(z.string()).default([]),
        tagIds: z.array(z.number()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const [newProduct] = await db.insert(products).values({
        userId,
        brand: input.brand,
        shadeCode: input.shadeCode,
        shadeName: input.shadeName || null,
        colorHex: input.colorHex,
        note: input.note || null,
        swatchImages: JSON.stringify(input.swatchImages),
      });

      const productId = Number(newProduct.insertId);

      // 关联标签
      if (input.tagIds.length > 0) {
        await db.insert(productTags).values(
          input.tagIds.map(tagId => ({ productId, tagId }))
        );
      }

      return { id: productId, ...input };
    }),

  // 批量创建产品（从识别结果）
  createBatch: authedQuery
    .input(
      z.array(
        z.object({
          brand: z.string().min(1),
          shadeCode: z.string().min(1),
          shadeName: z.string().optional(),
          colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#CCCCCC"),
          note: z.string().optional(),
          swatchImages: z.array(z.string()).default([]),
          tagIds: z.array(z.number()).default([]),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;
      const results = [];

      for (const item of input) {
        const [newProduct] = await db.insert(products).values({
          userId,
          brand: item.brand,
          shadeCode: item.shadeCode,
          shadeName: item.shadeName || null,
          colorHex: item.colorHex,
          note: item.note || null,
          swatchImages: JSON.stringify(item.swatchImages),
        });

        const productId = Number(newProduct.insertId);

        if (item.tagIds.length > 0) {
          await db.insert(productTags).values(
            item.tagIds.map(tagId => ({ productId, tagId }))
          );
        }

        results.push({ id: productId, ...item });
      }

      return results;
    }),

  // 更新产品
  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        brand: z.string().min(1).optional(),
        shadeCode: z.string().min(1).optional(),
        shadeName: z.string().optional(),
        colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        note: z.string().optional(),
        swatchImages: z.array(z.string()).optional(),
        tagIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;
      const { id, tagIds, ...updateData } = input;

      const updateValues: Record<string, unknown> = {};
      if (updateData.brand !== undefined) updateValues.brand = updateData.brand;
      if (updateData.shadeCode !== undefined) updateValues.shadeCode = updateData.shadeCode;
      if (updateData.shadeName !== undefined) updateValues.shadeName = updateData.shadeName;
      if (updateData.colorHex !== undefined) updateValues.colorHex = updateData.colorHex;
      if (updateData.note !== undefined) updateValues.note = updateData.note;
      if (updateData.swatchImages !== undefined) updateValues.swatchImages = JSON.stringify(updateData.swatchImages);

      await db
        .update(products)
        .set(updateValues)
        .where(and(eq(products.id, id), eq(products.userId, userId)));

      // 更新标签关联
      if (tagIds !== undefined) {
        await db.delete(productTags).where(eq(productTags.productId, id));
        if (tagIds.length > 0) {
          await db.insert(productTags).values(
            tagIds.map(tagId => ({ productId: id, tagId }))
          );
        }
      }

      return { id, ...updateData };
    }),

  // 删除产品
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      await db.delete(productTags).where(eq(productTags.productId, input.id));
      await db
        .delete(products)
        .where(and(eq(products.id, input.id), eq(products.userId, userId)));

      return { success: true };
    }),
});
