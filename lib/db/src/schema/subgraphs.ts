import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const subgraphsTable = pgTable("subgraphs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  orgId: integer("org_id").notNull(),
  description: text("description"),
  status: text("status", { enum: ["healthy", "degraded", "unreachable", "unknown"] }).notNull().default("unknown"),
  schemaVersion: text("schema_version"),
  lastPublishedAt: timestamp("last_published_at"),
  operationCount: integer("operation_count").notNull().default(0),
  errorRate: real("error_rate").notNull().default(0),
  p99Latency: real("p99_latency").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSubgraphSchema = createInsertSchema(subgraphsTable).omit({ id: true, createdAt: true });
export type InsertSubgraph = z.infer<typeof insertSubgraphSchema>;
export type Subgraph = typeof subgraphsTable.$inferSelect;
