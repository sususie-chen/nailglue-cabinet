import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
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

    const pool = mysql.createPool({
      uri: databaseUrl,
      connectionLimit: 5,
    });

    instance = drizzle(pool, { schema: fullSchema });
  }
  return instance;
}