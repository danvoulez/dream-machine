import type { ConnectorDef } from "#shared/types/connector";
import {
  fetchLinearIssuesViaGraphql,
  fetchLinearIssuesViaMcp,
} from "~~/server/utils/linear-mcp";

export const connectors: ConnectorDef[] = [
  {
    id: "linear",
    name: "Linear",
    description: "Issues, projects, cycles, and comments in your Linear workspace.",
    connector: "mcp.linear.app/linear",
    connectionName: "linear",
    icon: "i-simple-icons-linear",
    scopes: [],
    test: {
      label: "List my issues",
      run: async (token) => {
        const mcpResult = await fetchLinearIssuesViaMcp(token);
        if (mcpResult.ok) {
          return mcpResult.results;
        }

        const graphqlResult = await fetchLinearIssuesViaGraphql(token);
        if (graphqlResult.ok) {
          return graphqlResult.results;
        }

        throw new Error(mcpResult.error ?? graphqlResult.error ?? "Linear test failed");
      },
    },
  },
];

export function getConnector(id: string): ConnectorDef {
  const connector = connectors.find((entry) => entry.id === id);

  if (!connector) {
    throw createError({
      statusCode: 404,
      statusMessage: "Connector not found",
    });
  }

  return connector;
}
