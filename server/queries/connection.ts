import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not set");
    }

    console.log("[getDb] DATABASE_URL exists, length:", databaseUrl.length);
    console.log("[getDb] Creating pool...");

    try {
      const pool = createPool({
        uri: databaseUrl,
        connectionLimit: 5,
        // 关键改动：TiDB Serverless 自签名证书，先关闭验证做诊断
        ssl: { rejectUnauthorized: false },
        // 如果上面不行，试试这个：
        // ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
      });

      instance = drizzle(pool, { schema: fullSchema });
      console.log("[getDb] Pool created successfully");
    } catch (err) {
      console.error("[getDb] Pool creation failed:", err);
      throw err;
    }
  }
  return instance;
}
