import { Router } from "express";
import { db, usersTable, organizationsTable, subgraphsTable, billingPlansTable, subscriptionsTable, activityEventsTable } from "@workspace/db";
import { eq, count, sum, gte, lt, and } from "drizzle-orm";
import { GetDashboardMetricsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/summary", async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    [{ total: totalOrgs }],
    [{ active: activeOrgs }],
    [{ total: totalUsers }],
    [{ active: activeUsers }],
    [{ total: totalSubgraphs }],
    [{ healthy: healthySubgraphs }],
    plans,
    subs,
    [{ newOrgs }],
  ] = await Promise.all([
    db.select({ total: count() }).from(organizationsTable),
    db.select({ active: count() }).from(organizationsTable).where(eq(organizationsTable.status, "active")),
    db.select({ total: count() }).from(usersTable),
    db.select({ active: count() }).from(usersTable).where(eq(usersTable.status, "active")),
    db.select({ total: count() }).from(subgraphsTable),
    db.select({ healthy: count() }).from(subgraphsTable).where(eq(subgraphsTable.status, "healthy")),
    db.select().from(billingPlansTable),
    db.select().from(subscriptionsTable).where(eq(subscriptionsTable.status, "active")),
    db.select({ newOrgs: count() }).from(organizationsTable).where(gte(organizationsTable.createdAt, startOfMonth)),
  ]);

  const planMap = new Map(plans.map((p) => [p.id, p]));
  let monthlyRevenue = 0;
  for (const sub of subs) {
    const plan = planMap.get(sub.planId);
    if (plan) monthlyRevenue += plan.priceMonthly;
  }

  const [{ totalOps }] = await db.select({ totalOps: sum(organizationsTable.monthlyOperations) }).from(organizationsTable);

  return res.json({
    totalOrganizations: Number(totalOrgs),
    activeOrganizations: Number(activeOrgs),
    totalUsers: Number(totalUsers),
    activeUsers: Number(activeUsers),
    totalSubgraphs: Number(totalSubgraphs),
    healthySubgraphs: Number(healthySubgraphs),
    totalMonthlyOperations: Number(totalOps ?? 0),
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    newOrgsThisMonth: Number(newOrgs),
    churnedOrgsThisMonth: 0,
  });
});

router.get("/metrics", async (req, res) => {
  const parsed = GetDashboardMetricsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query params" });

  const period = parsed.data.period ?? "30d";
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;

  const points = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayStart = new Date(dateStr);
    const dayEnd = new Date(dateStr);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [{ newUsers }] = await db
      .select({ newUsers: count() })
      .from(usersTable)
      .where(and(gte(usersTable.createdAt, dayStart), lt(usersTable.createdAt, dayEnd)));

    const [{ newOrgs }] = await db
      .select({ newOrgs: count() })
      .from(organizationsTable)
      .where(and(gte(organizationsTable.createdAt, dayStart), lt(organizationsTable.createdAt, dayEnd)));

    const baseOps = Math.floor(Math.random() * 50000) + 10000;
    points.push({
      date: dateStr,
      operations: baseOps,
      errors: Math.floor(baseOps * (Math.random() * 0.02)),
      p99Latency: Math.round((Math.random() * 200 + 50) * 10) / 10,
      newUsers: Number(newUsers),
      newOrgs: Number(newOrgs),
    });
  }

  return res.json(points);
});

router.get("/plan-breakdown", async (_req, res) => {
  const [plans, subs] = await Promise.all([
    db.select().from(billingPlansTable),
    db.select().from(subscriptionsTable),
  ]);

  const orgsPerPlan = new Map<number, number>();
  for (const sub of subs) {
    orgsPerPlan.set(sub.planId, (orgsPerPlan.get(sub.planId) ?? 0) + 1);
  }

  const breakdown = plans.map((plan) => {
    const orgCount = orgsPerPlan.get(plan.id) ?? 0;
    return {
      planName: plan.name,
      planSlug: plan.slug,
      orgCount,
      revenue: Math.round(orgCount * plan.priceMonthly * 100) / 100,
    };
  });

  return res.json(breakdown);
});

export default router;
