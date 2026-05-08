import { Router } from "express";
import { db, billingPlansTable, subscriptionsTable, organizationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetSubscriptionParams,
  UpdateSubscriptionParams,
  UpdateSubscriptionBody,
} from "@workspace/api-zod";

const router = Router();

router.get("/plans", async (_req, res) => {
  const plans = await db.select().from(billingPlansTable).orderBy(billingPlansTable.priceMonthly);
  return res.json(
    plans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      maxUsers: p.maxUsers ?? null,
      maxSubgraphs: p.maxSubgraphs ?? null,
      maxMonthlyOperations: p.maxMonthlyOperations ?? null,
      features: (p.features as string[]) ?? [],
    }))
  );
});

router.get("/subscriptions/:orgId", async (req, res) => {
  const parsed = GetSubscriptionParams.safeParse({ orgId: Number(req.params.orgId) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid orgId" });

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.orgId, parsed.data.orgId))
    .limit(1);

  if (!sub) return res.status(404).json({ error: "Subscription not found" });

  const [[plan], [org]] = await Promise.all([
    db.select().from(billingPlansTable).where(eq(billingPlansTable.id, sub.planId)).limit(1),
    db.select({ name: organizationsTable.name }).from(organizationsTable).where(eq(organizationsTable.id, sub.orgId)).limit(1),
  ]);

  return res.json({
    orgId: sub.orgId,
    orgName: org?.name ?? "Unknown",
    status: sub.status,
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    plan: {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      maxUsers: plan.maxUsers ?? null,
      maxSubgraphs: plan.maxSubgraphs ?? null,
      maxMonthlyOperations: plan.maxMonthlyOperations ?? null,
      features: (plan.features as string[]) ?? [],
    },
  });
});

router.patch("/subscriptions/:orgId", async (req, res) => {
  const paramsParsed = UpdateSubscriptionParams.safeParse({ orgId: Number(req.params.orgId) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid orgId" });

  const bodyParsed = UpdateSubscriptionBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid request body" });

  const updates: Partial<typeof subscriptionsTable.$inferInsert> = {
    planId: bodyParsed.data.planId,
  };
  if (bodyParsed.data.cancelAtPeriodEnd != null) {
    updates.cancelAtPeriodEnd = bodyParsed.data.cancelAtPeriodEnd;
  }

  await db
    .update(subscriptionsTable)
    .set(updates)
    .where(eq(subscriptionsTable.orgId, paramsParsed.data.orgId));

  await db
    .update(organizationsTable)
    .set({ planId: bodyParsed.data.planId })
    .where(eq(organizationsTable.id, paramsParsed.data.orgId));

  const [sub] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.orgId, paramsParsed.data.orgId))
    .limit(1);

  const [[plan], [org]] = await Promise.all([
    db.select().from(billingPlansTable).where(eq(billingPlansTable.id, sub.planId)).limit(1),
    db.select({ name: organizationsTable.name }).from(organizationsTable).where(eq(organizationsTable.id, sub.orgId)).limit(1),
  ]);

  return res.json({
    orgId: sub.orgId,
    orgName: org?.name ?? "Unknown",
    status: sub.status,
    currentPeriodStart: sub.currentPeriodStart.toISOString(),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    plan: {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      maxUsers: plan.maxUsers ?? null,
      maxSubgraphs: plan.maxSubgraphs ?? null,
      maxMonthlyOperations: plan.maxMonthlyOperations ?? null,
      features: (plan.features as string[]) ?? [],
    },
  });
});

export default router;
