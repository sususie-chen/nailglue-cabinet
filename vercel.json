import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
    // 💡 关键修改：TiDB Cloud 必须通过 SSL 连接
    // 如果你在 DATABASE_URL 结尾已经加了 ?ssl={"rejectUnauthorized":true}，这里也可以保持原样
    // 但为了保险，建议在这里明确指定（drizzle-kit 会优先使用 url 里的参数）
  },
});
