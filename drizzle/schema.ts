import {
  boolean,
  double,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const properties = mysqlTable(
  "properties",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    address: varchar("address", { length: 500 }).notNull(),
    city: varchar("city", { length: 120 }).notNull(),
    price: double("price").notNull(),
    kind: mysqlEnum("kind", ["sale", "rent"]).notNull(),
    type: mysqlEnum("type", ["Apartment", "House", "Loft"]).notNull(),
    beds: int("beds").notNull(),
    baths: double("baths").notNull(),
    size: int("size").notNull(),
    description: text("description").notNull(),
    images: json("images").$type<string[]>().notNull(),
    amenities: json("amenities").$type<string[]>().notNull(),
    tourKind: mysqlEnum("tourKind", [
      "demo",
      "model",
      "embed",
      "none",
    ]).notNull(),
    tourUrl: varchar("tourUrl", { length: 2048 }),
    status: mysqlEnum("status", ["draft", "published", "removed"])
      .default("draft")
      .notNull(),
    featured: boolean("featured").default(false).notNull(),
    isDemo: boolean("isDemo").default(false).notNull(),
    latitude: double("latitude"),
    longitude: double("longitude"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("properties_owner_idx").on(table.ownerId),
    index("properties_public_idx").on(table.status, table.createdAt),
  ]
);

export const favourites = mysqlTable(
  "favourites",
  {
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    propertyId: int("propertyId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    primaryKey({ columns: [table.userId, table.propertyId] }),
    index("favourites_property_idx").on(table.propertyId),
  ]
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    read: boolean("read").default(false).notNull(),
  },
  table => [index("notifications_user_idx").on(table.userId, table.createdAt)]
);

export const enquiries = mysqlTable(
  "enquiries",
  {
    id: int("id").autoincrement().primaryKey(),
    propertyId: int("propertyId").notNull(),
    ownerId: int("ownerId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    senderId: int("senderId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    phone: varchar("phone", { length: 40 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("enquiries_owner_idx").on(table.ownerId, table.createdAt),
    index("enquiries_property_idx").on(table.propertyId),
  ]
);

export type PropertyRow = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;
export type Favourite = typeof favourites.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Enquiry = typeof enquiries.$inferSelect;
