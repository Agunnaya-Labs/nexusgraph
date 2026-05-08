import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const billingPlansTable = pgTable("billing_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  priceMonthly: real("price_monthly").notNull(),
  priceYearly: real("price_yearly").notNull(),
  maxUsers: integer("max_users"),
  maxSubgraphs: integer("max_subgraphs"),
  maxMonthlyOperations: integer("max_monthly_operations"),
  features: jsonb("features").notNull().$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptionsTable = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull().unique(),
  planId: integer("plan_id").notNull(),
  status: text("status", { enum: ["active", "trialing", "cancelled", "past_due"] }).notNull().default("trialing"),
  currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBillingPlanSchema = createInsertSchema(billingPlansTable).omit({ id: true, createdAt: true });
export type InsertBillingPlan = z.infer<typeof insertBillingPlanSchema>;
export type BillingPlan = typeof billingPlansTable.$inferSelect;

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({ id: true, createdAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
