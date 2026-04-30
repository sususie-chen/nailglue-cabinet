import { drizzle } from "drizzle-orm/mysql2";
import { createPool } from "mysql2/promise";  // 关键：命名导出，不是默认导出
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
    
    // 直接传 connection string，不要包成 { uri: ... }
    const pool = createPool(databaseUrl);
    instance = drizzle(pool, { schema: fullSchema });
  }
  return instance;
}