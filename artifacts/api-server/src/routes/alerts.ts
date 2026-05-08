import { Router } from "express";
import { db, subgraphsTable, organizationsTable, subscriptionsTable } from "@workspace/db";
import { eq, lt, and } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const now = new Date();
  const alerts: Array<{
    id: string;
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    orgName: string | null;
    resourceType: string;
    resourceName: string;
    createdAt: string;
  }> = [];

  const [degradedSubgraphs, unreachableSubgraphs, expiringSubscriptions] = await Promise.all([
    db.select().from(subgraphsTable).where(eq(subgraphsTable.status, "degraded")),
    db.select().from(subgraphsTable).where(eq(subgraphsTable.status, "unreachable")),
    db.select().from(subscriptionsTable).where(
      and(
        eq(subscriptionsTable.status, "active"),
        lt(subscriptionsTable.currentPeriodEnd, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
      )
    ),
  ]);

  for (const sg of unreachableSubgraphs) {
    const [org] = await db.select({ name: organizationsTable.name })
      .from(organizationsTable).where(eq(organizationsTable.id, sg.orgId)).limit(1);
    alerts.push({
      id: `sg-unreachable-${sg.id}`,
      severity: "critical",
      title: "Subgraph Unreachable",
      description: `"${sg.name}" has been unreachable. Check routing URL and service health.`,
      orgName: org?.name ?? null,
      resourceType: "subgraph",
      resourceName: sg.name,
      createdAt: sg.lastPublishedAt?.toISOString() ?? sg.createdAt.toISOString(),
    });
  }

  for (const sg of degradedSubgraphs) {
    const [org] = await db.select({ name: organizationsTable.name })
      .from(organizationsTable).where(eq(organizationsTable.id, sg.orgId)).limit(1);
    alerts.push({
      id: `sg-degraded-${sg.id}`,
      severity: "warning",
      title: "Subgraph Degraded",
      description: `"${sg.name}" p99 latency is ${sg.p99Latency}ms — exceeds 200ms threshold.`,
      orgName: org?.name ?? null,
      resourceType: "subgraph",
      resourceName: sg.name,
      createdAt: sg.lastPublishedAt?.toISOString() ?? sg.createdAt.toISOString(),
    });
  }

  for (const sub of expiringSubscriptions) {
    const daysLeft = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const [org] = await db.select({ name: organizationsTable.name })
      .from(organizationsTable).where(eq(organizationsTable.id, sub.orgId)).limit(1);
    alerts.push({
      id: `sub-expiring-${sub.orgId}`,
      severity: daysLeft <= 2 ? "critical" : "warning",
      title: "Subscription Expiring Soon",
      description: `${org?.name ?? "An organization"}'s subscription renews in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`,
      orgName: org?.name ?? null,
      resourceType: "subscription",
      resourceName: org?.name ?? "Unknown",
      createdAt: new Date().toISOString(),
    });
  }

  alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return res.json(alerts);
});

export default router;
