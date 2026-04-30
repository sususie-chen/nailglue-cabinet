import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

export const authRouter = createRouter({
  // 临时 MOCK：绕过数据库，确认后端通路
  login: publicQuery
    .input(
      z.object({
        username: z.string().min(1).max(50),
        password: z.string().max(50).optional(),
      })
    )
    .mutation(async ({ input }) => {
      console.log("[MOCK LOGIN] received:", input.username);
      return {
        token: "mock_token_" + Date.now(),
        user: {
          id: 1,
          name: input.username,
          unionId: input.username,
          email: null,
          avatar: null,
          role: "user",
        },
      };
    }),

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

  logout: publicQuery.mutation(() => ({ success: true })),
});
