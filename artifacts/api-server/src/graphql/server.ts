import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { type Express } from "express";
import { federatedSchema } from "./schema";
import { logger } from "../lib/logger";

export async function startGraphQL(app: Express): Promise<void> {
  const server = new ApolloServer({
    schema: federatedSchema,
    introspection: true,
    formatError: (error) => {
      logger.error({ error }, "GraphQL error");
      return error;
    },
  });

  await server.start();

  app.use(
    "/api/graphql",
    expressMiddleware(server, {
      context: async ({ req }) => ({ req }),
    })
  );

  logger.info("Apollo GraphQL server started at /api/graphql");
}
