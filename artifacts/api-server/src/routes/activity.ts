import { Router } from "express";
import { db, activityEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { ListActivityQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const parsed = ListActivityQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query params" });

  const { orgId, limit = 50 } = parsed.data;

  let events: (typeof activityEventsTable.$inferSelect)[];

  if (orgId) {
    events = await db
      .select()
      .from(activityEventsTable)
      .where(eq(activityEventsTable.orgId, orgId))
      .orderBy(desc(activityEventsTable.createdAt))
      .limit(limit ?? 50);
  } else {
    events = await db
      .select()
      .from(activityEventsTable)
      .orderBy(desc(activityEventsTable.createdAt))
      .limit(limit ?? 50);
  }

  return res.json(
    events.map((e) => ({
      id: e.id,
      type: e.type,
      description: e.description,
      orgId: e.orgId ?? null,
      orgName: e.orgName ?? null,
      userId: e.userId ?? null,
      userName: e.userName ?? null,
      metadata: e.metadata ?? null,
      createdAt: e.createdAt.toISOString(),
    }))
  );
});

export default router;
