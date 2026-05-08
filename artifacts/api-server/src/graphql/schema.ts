import { buildSubgraphSchema } from "@apollo/subgraph";
import { gql } from "graphql-tag";
import { db, usersTable, organizationsTable, subgraphsTable, billingPlansTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const typeDefs = gql`
  extend schema @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@external"])

  type Query {
    # Users subgraph
    user(id: ID!): User
    users: [User!]!

    # Organizations subgraph
    organization(id: ID!): Organization
    organizations: [Organization!]!

    # Subgraphs subgraph
    subgraph(id: ID!): Subgraph
    subgraphs: [Subgraph!]!

    # Billing subgraph
    billingPlans: [BillingPlan!]!

    # Platform overview
    platformSummary: PlatformSummary!
  }

  type User @key(fields: "id") {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    status: UserStatus!
    organization: Organization
    createdAt: String!
    lastActiveAt: String
  }

  enum UserRole {
    admin
    developer
    viewer
  }

  enum UserStatus {
    active
    suspended
    pending
  }

  type Organization @key(fields: "id") {
    id: ID!
    name: String!
    slug: String!
    domain: String
    plan: BillingPlan!
    status: OrgStatus!
    users: [User!]!
    subgraphs: [Subgraph!]!
    monthlyOperations: Int!
    createdAt: String!
  }

  enum OrgStatus {
    active
    suspended
    trialing
    cancelled
  }

  type Subgraph @key(fields: "id") {
    id: ID!
    name: String!
    url: String!
    organization: Organization!
    status: SubgraphStatus!
    schemaVersion: String
    lastPublishedAt: String
    description: String
    operationCount: Int!
    errorRate: Float!
    p99Latency: Float!
    createdAt: String!
  }

  enum SubgraphStatus {
    healthy
    degraded
    unreachable
    unknown
  }

  type BillingPlan @key(fields: "id") {
    id: ID!
    name: String!
    slug: String!
    priceMonthly: Float!
    priceYearly: Float!
    maxUsers: Int
    maxSubgraphs: Int
    maxMonthlyOperations: Int
    features: [String!]!
  }

  type PlatformSummary {
    totalOrganizations: Int!
    activeOrganizations: Int!
    totalUsers: Int!
    totalSubgraphs: Int!
    healthySubgraphs: Int!
  }
`;

const resolvers = {
  Query: {
    user: async (_: unknown, { id }: { id: string }) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(id))).limit(1);
      return user ?? null;
    },
    users: async () => {
      return db.select().from(usersTable).orderBy(usersTable.createdAt);
    },
    organization: async (_: unknown, { id }: { id: string }) => {
      const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, Number(id))).limit(1);
      return org ?? null;
    },
    organizations: async () => {
      return db.select().from(organizationsTable).orderBy(organizationsTable.createdAt);
    },
    subgraph: async (_: unknown, { id }: { id: string }) => {
      const [sg] = await db.select().from(subgraphsTable).where(eq(subgraphsTable.id, Number(id))).limit(1);
      return sg ?? null;
    },
    subgraphs: async () => {
      return db.select().from(subgraphsTable).orderBy(subgraphsTable.createdAt);
    },
    billingPlans: async () => {
      return db.select().from(billingPlansTable).orderBy(billingPlansTable.priceMonthly);
    },
    platformSummary: async () => {
      const [orgs, users, subgraphs] = await Promise.all([
        db.select().from(organizationsTable),
        db.select().from(usersTable),
        db.select().from(subgraphsTable),
      ]);
      return {
        totalOrganizations: orgs.length,
        activeOrganizations: orgs.filter((o) => o.status === "active").length,
        totalUsers: users.length,
        totalSubgraphs: subgraphs.length,
        healthySubgraphs: subgraphs.filter((s) => s.status === "healthy").length,
      };
    },
  },

  User: {
    __resolveReference: async (ref: { id: string }) => {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(ref.id))).limit(1);
      return user ?? null;
    },
    organization: async (user: { orgId: number | null }) => {
      if (!user.orgId) return null;
      const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, user.orgId)).limit(1);
      return org ?? null;
    },
  },

  Organization: {
    __resolveReference: async (ref: { id: string }) => {
      const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, Number(ref.id))).limit(1);
      return org ?? null;
    },
    plan: async (org: { planId: number }) => {
      const [plan] = await db.select().from(billingPlansTable).where(eq(billingPlansTable.id, org.planId)).limit(1);
      return plan ?? null;
    },
    users: async (org: { id: number }) => {
      return db.select().from(usersTable).where(eq(usersTable.orgId, org.id));
    },
    subgraphs: async (org: { id: number }) => {
      return db.select().from(subgraphsTable).where(eq(subgraphsTable.orgId, org.id));
    },
  },

  Subgraph: {
    __resolveReference: async (ref: { id: string }) => {
      const [sg] = await db.select().from(subgraphsTable).where(eq(subgraphsTable.id, Number(ref.id))).limit(1);
      return sg ?? null;
    },
    organization: async (sg: { orgId: number }) => {
      const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, sg.orgId)).limit(1);
      return org ?? null;
    },
  },

  BillingPlan: {
    __resolveReference: async (ref: { id: string }) => {
      const [plan] = await db.select().from(billingPlansTable).where(eq(billingPlansTable.id, Number(ref.id))).limit(1);
      return plan ?? null;
    },
  },
};

export const federatedSchema = buildSubgraphSchema({ typeDefs, resolvers });
