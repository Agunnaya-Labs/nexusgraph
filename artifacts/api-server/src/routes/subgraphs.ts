import { Router } from "express";
import { db, subgraphsTable, organizationsTable, activityEventsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  ListSubgraphsQueryParams,
  CreateSubgraphBody,
  GetSubgraphParams,
  UpdateSubgraphParams,
  UpdateSubgraphBody,
  DeleteSubgraphParams,
  PublishSubgraphParams,
  PublishSubgraphBody,
} from "@workspace/api-zod";

const router = Router();

async function buildSubgraphResponse(sg: typeof subgraphsTable.$inferSelect) {
  const [org] = await db
    .select({ name: organizationsTable.name })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, sg.orgId))
    .limit(1);

  return {
    id: sg.id,
    name: sg.name,
    url: sg.url,
    orgId: sg.orgId,
    orgName: org?.name ?? "Unknown",
    status: sg.status,
    schemaVersion: sg.schemaVersion ?? null,
    lastPublishedAt: sg.lastPublishedAt?.toISOString() ?? null,
    description: sg.description ?? null,
    operationCount: sg.operationCount,
    errorRate: sg.errorRate,
    p99Latency: sg.p99Latency,
    createdAt: sg.createdAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const parsed = ListSubgraphsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query params" });

  const { orgId, status } = parsed.data;
  const conditions = [];
  if (orgId) conditions.push(eq(subgraphsTable.orgId, orgId));
  if (status) conditions.push(eq(subgraphsTable.status, status as "healthy" | "degraded" | "unreachable" | "unknown"));

  const sgs = await db
    .select()
    .from(subgraphsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(subgraphsTable.createdAt);

  const responses = await Promise.all(sgs.map(buildSubgraphResponse));
  return res.json(responses);
});

router.post("/", async (req, res) => {
  const parsed = CreateSubgraphBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

  const [sg] = await db
    .insert(subgraphsTable)
    .values({
      name: parsed.data.name,
      url: parsed.data.url,
      orgId: parsed.data.orgId,
      description: parsed.data.description ?? null,
    })
    .returning();

  const [org] = await db.select({ name: organizationsTable.name }).from(organizationsTable).where(eq(organizationsTable.id, sg.orgId)).limit(1);

  await db.insert(activityEventsTable).values({
    type: "org_created",
    description: `Subgraph "${sg.name}" registered`,
    orgId: sg.orgId,
    orgName: org?.name ?? null,
  });

  return res.status(201).json(await buildSubgraphResponse(sg));
});

router.get("/:id", async (req, res) => {
  const parsed = GetSubgraphParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [sg] = await db.select().from(subgraphsTable).where(eq(subgraphsTable.id, parsed.data.id)).limit(1);
  if (!sg) return res.status(404).json({ error: "Subgraph not found" });

  return res.json(await buildSubgraphResponse(sg));
});

router.patch("/:id", async (req, res) => {
  const paramsParsed = UpdateSubgraphParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = UpdateSubgraphBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid request body" });

  const updates: Partial<typeof subgraphsTable.$inferInsert> = {};
  if (bodyParsed.data.name != null) updates.name = bodyParsed.data.name;
  if (bodyParsed.data.url != null) updates.url = bodyParsed.data.url;
  if (bodyParsed.data.description !== undefined) updates.description = bodyParsed.data.description;
  if (bodyParsed.data.status != null) updates.status = bodyParsed.data.status as "healthy" | "degraded" | "unreachable" | "unknown";

  const [sg] = await db
    .update(subgraphsTable)
    .set(updates)
    .where(eq(subgraphsTable.id, paramsParsed.data.id))
    .returning();

  if (!sg) return res.status(404).json({ error: "Subgraph not found" });
  return res.json(await buildSubgraphResponse(sg));
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteSubgraphParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(subgraphsTable).where(eq(subgraphsTable.id, parsed.data.id));
  return res.json({ message: "Subgraph deleted" });
});

router.post("/:id/publish", async (req, res) => {
  const paramsParsed = PublishSubgraphParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = PublishSubgraphBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid request body" });

  const [sg] = await db
    .update(subgraphsTable)
    .set({
      schemaVersion: bodyParsed.data.schemaVersion,
      lastPublishedAt: new Date(),
      status: "healthy",
    })
    .where(eq(subgraphsTable.id, paramsParsed.data.id))
    .returning();

  if (!sg) return res.status(404).json({ error: "Subgraph not found" });

  const [org] = await db.select({ name: organizationsTable.name }).from(organizationsTable).where(eq(organizationsTable.id, sg.orgId)).limit(1);

  await db.insert(activityEventsTable).values({
    type: "subgraph_published",
    description: `Subgraph "${sg.name}" published v${bodyParsed.data.schemaVersion}`,
    orgId: sg.orgId,
    orgName: org?.name ?? null,
    metadata: { changelog: bodyParsed.data.changelog ?? null },
  });

  return res.json(await buildSubgraphResponse(sg));
});

export default router;
