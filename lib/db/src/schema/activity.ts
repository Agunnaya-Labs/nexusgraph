import { pgTable, serial, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityEventsTable = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  type: text("type", {
    enum: [
      "user_created", "user_suspended", "org_created", "org_cancelled",
      "subgraph_published", "subgraph_degraded", "plan_upgraded", "plan_downgraded"
    ]
  }).notNull(),
  description: text("description").notNull(),
  orgId: integer("org_id"),
  orgName: text("org_name"),
  userId: integer("user_id"),
  userName: text("user_name"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivityEventSchema = createInsertSchema(activityEventsTable).omit({ id: true, createdAt: true });
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;
export type ActivityEvent = typeof activityEventsTable.$inferSelect;
