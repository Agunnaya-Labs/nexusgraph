import { Router } from "express";
import { db, usersTable, organizationsTable, subgraphsTable } from "@workspace/db";
import { ilike, or, eq } from "drizzle-orm";
import { verifyToken, extractToken } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const token = extractToken(req.headers.authorization);
  if (!token || !verifyToken(token)) return res.status(401).json({ error: "Not authenticated" });

  const q = String(req.query.q ?? "").trim();
  if (!q || q.length < 2) return res.json({ users: [], organizations: [], subgraphs: [] });

  const pattern = `%${q}%`;

  const [users, organizations, subgraphs] = await Promise.all([
    db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, status: usersTable.status })
      .from(usersTable)
      .where(or(ilike(usersTable.name, pattern), ilike(usersTable.email, pattern)))
      .limit(5),
    db.select({ id: organizationsTable.id, name: organizationsTable.name, slug: organizationsTable.slug, status: organizationsTable.status })
      .from(organizationsTable)
      .where(or(ilike(organizationsTable.name, pattern), ilike(organizationsTable.slug, pattern)))
      .limit(5),
    db.select({ id: subgraphsTable.id, name: subgraphsTable.name, url: subgraphsTable.url, status: subgraphsTable.status })
      .from(subgraphsTable)
      .where(or(ilike(subgraphsTable.name, pattern), ilike(subgraphsTable.url, pattern)))
      .limit(5),
  ]);

  return res.json({ users, organizations, subgraphs });
});

export default router;
