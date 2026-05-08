import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, organizationsTable } from "@workspace/db";
import { eq, and, count, ilike, or } from "drizzle-orm";
import {
  ListUsersQueryParams,
  CreateUserBody,
  UpdateUserParams,
  UpdateUserBody,
  DeleteUserParams,
  GetUserParams,
} from "@workspace/api-zod";

const router = Router();

async function buildUserResponse(user: typeof usersTable.$inferSelect) {
  let orgName: string | null = null;
  if (user.orgId) {
    const [org] = await db
      .select({ name: organizationsTable.name })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, user.orgId))
      .limit(1);
    orgName = org?.name ?? null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    orgId: user.orgId ?? null,
    orgName,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt.toISOString(),
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
  };
}

router.get("/", async (req, res) => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query params" });

  const { orgId, role, status, limit = 50, offset = 0 } = parsed.data;

  const conditions = [];
  if (orgId) conditions.push(eq(usersTable.orgId, orgId));
  if (role) conditions.push(eq(usersTable.role, role as "admin" | "developer" | "viewer"));
  if (status) conditions.push(eq(usersTable.status, status as "active" | "suspended" | "pending"));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [users, [{ value: total }]] = await Promise.all([
    db.select().from(usersTable).where(where).limit(limit ?? 50).offset(offset ?? 0).orderBy(usersTable.createdAt),
    db.select({ value: count() }).from(usersTable).where(where),
  ]);

  const userResponses = await Promise.all(users.map(buildUserResponse));
  return res.json({ users: userResponses, total: Number(total) });
});

router.post("/", async (req, res) => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid request body" });

  const { email, name, role, orgId, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({ email, name, role, orgId: orgId ?? null, passwordHash })
    .returning();

  return res.status(201).json(await buildUserResponse(user));
});

router.get("/:id", async (req, res) => {
  const parsed = GetUserParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.id)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json(await buildUserResponse(user));
});

router.patch("/:id", async (req, res) => {
  const paramsParsed = UpdateUserParams.safeParse({ id: Number(req.params.id) });
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = UpdateUserBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid request body" });

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (bodyParsed.data.name != null) updates.name = bodyParsed.data.name;
  if (bodyParsed.data.role != null) updates.role = bodyParsed.data.role as "admin" | "developer" | "viewer";
  if (bodyParsed.data.status != null) updates.status = bodyParsed.data.status as "active" | "suspended" | "pending";
  if (bodyParsed.data.orgId !== undefined) updates.orgId = bodyParsed.data.orgId;

  const [user] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, paramsParsed.data.id))
    .returning();

  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(await buildUserResponse(user));
});

router.delete("/:id", async (req, res) => {
  const parsed = DeleteUserParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(usersTable).where(eq(usersTable.id, parsed.data.id));
  return res.json({ message: "User deleted" });
});

export default router;
