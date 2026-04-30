import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { signSessionToken } from "./kimi/session";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";

export const authRouter = createRouter({
  // 注册/登录二合一：用户名存在则登录，不存在则注册
  login: publicQuery
    .input(
      z.object({
        username: z.string().min(1).max(50),
        password: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const username = input.username.trim();

      // 查找用户
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.unionId, username));

      if (existing) {
        // 用户存在：如果有密码则验证密码，无密码直接登录
        if (existing.password && existing.password !== (input.password || "")) {
          throw new Error("密码错误");
        }
        // 更新最后登录时间
        await db
          .update(users)
          .set({ lastSignInAt: new Date() })
          .where(eq(users.id, existing.id));

        const token = await signSessionToken(existing.id);
        return { token, user: existing };
      }

      // 用户不存在：自动注册
      const [newUser] = await db.insert(users).values({
        unionId: username,
        name: username,
        password: input.password || null,
      });

      const userId = Number(newUser.insertId);
      const token = await signSessionToken(userId);

      const [created] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      return { token, user: created };
    }),

  // 获取当前用户信息
  me: publicQuery.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return {
      id: ctx.user.id,
      name: ctx.user.name || ctx.user.unionId,
      email: ctx.user.email,
      avatar: ctx.user.avatar,
      role: ctx.user.role,
    };
  }),

  // 退出登录（前端清除 token 即可）
  logout: publicQuery.mutation(() => {
    return { success: true };
  }),
});
