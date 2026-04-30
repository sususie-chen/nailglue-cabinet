import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is not set");

    // 解析 URL，去掉 mysql2 会自动处理的 ssl 查询参数
    const url = new URL(databaseUrl);
    url.searchParams.delete("ssl");  // 关键：删除 URL 里的 ssl 参数，避免冲突

    const pool = createPool({
      host: url.hostname,
      port: Number(url.port) || 4000,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      connectionLimit: 5,
      ssl: { rejectUnauthorized: false },  // TiDB Serverless 自签名证书
    });

    instance = drizzle(pool, { schema: fullSchema });
  }
  return instance;
}
