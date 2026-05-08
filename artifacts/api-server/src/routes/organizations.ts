import { Router } from "express";
import { db, organizationsTable, usersTable, subgraphsTable, billingPlansTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import {
  ListOrganizationsQueryParams,
  CreateOrganizationBody,
  UpdateOrganizationParams,
  UpdateOrganizationBody,
  DeleteOrganizationParams,
  GetOrganizationParams,
} from "@workspace/api-zod";

const router = Router();

async function buildOrgResponse(org: typeof organizationsTable.$inferSelect) {
  const [[{ value: userCount }], [{ value: subgraphCount }], plan] = await Promise.all([
    db.select({ value: count() }).from(usersTable).where(eq(usersTable.orgId, org.id)),
    db.select({ value: count() }).from(subgraphsTable).where(eq(subgraphsTable.orgId, org.id)),
    db.select().from(billingPlansTable).where(eq(billingPlansTable.id, org.planId)).limit(1),
  ]);

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    domain: org.domain ?? null,
    planId: org.planId,
    planName: plan[0]?.name ?? "Unknown",
    status: org.status,
    userCount: Number(userCount),
    subgraphCount: Number(subgraphCount),
    monthlyOperations: org.monthlyOperations,
    createdAt: org.createdAt.toISOString(),
    logoUrl: org.logoUrl ?? null,
  };
}

router.get("/", async (req, res) => {
  const parsed = ListOrganizationsQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query params" });

  const { plan, status, limit = 50, offset = 0 } = parsed.data;

  let orgs: (typeof organizationsTable.$inferSelect)[];

  if (plan || status) {
    const conditions = [];
    if (status) conditions.push(eq(organizationsTable.status, status as "active" | "suspended" | "trialing" | "cancelled"));
    orgs = await db.select().from(organizationsTable).where(and(...conditions)).limit(limit ?? 50).offset(offset ?? 0).orderBy(organizationsTable.createdAt);
  } else {
    orgs = await db.select().from(organizationsTable).limit(limit ?? 50).offset(offset ?? 0).orderBy(organizationsTable.createdAt);
  }

  const [orgResponses, [{ value: total }]] = await Promise.all([
    Promise.all(orgs.map(buildOrgResponse)),
    db.select({ value: count() }).from(organizationsTable),
  ]);

  return res.json({ organizations: orgResponses, total: Number(total) });
});

router.post("/", async (req, res) => {
  const parsed = CreateOrganizationBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

  const [org] = await db
    .insert(organizationsTable)
    .values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      domain: parsed.data.domain ?? null,
      planId: parsed.data.planId,
    })
    .returning();

  return res.status(201).json(await buildOrgResponse(org));
});

router.get("/:id", async (req, res) => {
  const parsed = GetOrganizationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, parsed.data.id)).limit(1);
  if (!org) return res.status(404).json({ error: "Organization not found" });

  return res.json(await buildOrgResponse(org));
});

router.patch("/:id", async (req, res) => {
  const paramsParsed = UpdateOrganizationParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = UpdateOrganizationBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid request body" });

  const updates: Partial<typeof organizationsTable.$inferInsert> = {};
  if (bodyParsed.data.name != null) updates.name = bodyParsed.data.name;
  if (bodyParsed.data.domain !== undefined) updates.domain = bodyParsed.data.domain;
  if (bodyParsed.data.status != null) updates.status = bodyParsed.data.status as "active" | "suspended" | "trialing" | "cancelled";

  const [org] = await db
    .update(organizationsTable)
    .set(updates)
    .where(eq(organizationsTable.id, paramsParsed.data.id))
    .returning();

  if (!org) return res.status(404).json({ error: "Organization not found" });
  return res.json(await buildOrgResponse(org));
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteOrganizationParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(organizationsTable).where(eq(organizationsTable.id, parsed.data.id));
  return res.json({ message: "Organization deleted" });
});

export default router;
