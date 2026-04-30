import {
  mysqlTable,
  mysqlEnum,
  serial,
  bigint,
  varchar,
  text,
  longtext,
  timestamp,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id"),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(), // 存用户名
  name: varchar("name", { length: 255 }),
  password: varchar("password", { length: 255 }), // 可选密码
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 甲油胶产品表
export const products = mysqlTable("products", {
  id: serial("id"),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  brand: varchar("brand", { length: 255 }).notNull(),
  shadeCode: varchar("shadeCode", { length: 255 }).notNull(),
  shadeName: varchar("shadeName", { length: 255 }),
  colorHex: varchar("colorHex", { length: 7 }).notNull().default("#CCCCCC"),
  note: text("note"),
  swatchImages: longtext("swatchImages"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// 标签表
export const tags = mysqlTable("tags", {
  id: serial("id"),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["color", "function"]).notNull(),
  colorHex: varchar("colorHex", { length: 7 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

// 产品标签关联表
export const productTags = mysqlTable("productTags", {
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  tagId: bigint("tagId", { mode: "number", unsigned: true }).notNull(),
});

export type ProductTag = typeof productTags.$inferSelect;

// 识别记录表
export const recognitionRecords = mysqlTable("recognitionRecords", {
  id: serial("id"),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  imageData: longtext("imageData").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "failed"]).default("pending").notNull(),
  result: longtext("result"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type RecognitionRecord = typeof recognitionRecords.$inferSelect;

export interface RecognizedProduct {
  id: string;
  imageData: string;
  regionImage: string;
  brand: string;
  shadeCode: string;
  shadeName?: string;
  colorHex?: string;
  tagIds?: number[];
  isNailPolish: boolean;
}
