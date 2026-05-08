#!/usr/bin/env bash
# Publish NexusGraph federation subgraph to Apollo Studio
# Usage: GRAPH_REF=<your-graph>@<variant> ./rover-publish.sh
#
# Get your Graph Ref from: https://studio.apollographql.com -> Your Graph -> Settings
# Format: graphname@variant (e.g. nexusgraph@main or nexusgraph@current)

set -e

ROVER="/home/runner/workspace/.rover/bin/rover"
SCHEMA="$(dirname "$0")/schema.graphql"

if [ -z "$GRAPH_REF" ]; then
  echo "Error: GRAPH_REF is required"
  echo "Example: GRAPH_REF=mygraph@main ./rover-publish.sh"
  exit 1
fi

echo "Introspecting live schema from /api/graphql..."
$ROVER subgraph introspect http://localhost:80/api/graphql --output "$SCHEMA"

echo "Publishing to Apollo Studio: $GRAPH_REF"
$ROVER subgraph publish "$GRAPH_REF" \
  --name nexusgraph \
  --schema "$SCHEMA" \
  --routing-url "${ROUTING_URL:-https://nexusgraph.replit.app/api/graphql}"

echo "Done! View at https://studio.apollographql.com/graph/$GRAPH_REF"
