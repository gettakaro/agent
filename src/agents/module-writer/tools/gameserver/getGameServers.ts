import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const getGameServers: ToolDefinition = {
  name: "getGameServers",
  description: "List all game servers available in Takaro. Use this to find a server to install the module on.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  execute: async (_args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const response = await context.takaroClient.gameserver.gameServerControllerSearch();

    const servers = response.data.data.map((server) => ({
      id: server.id,
      name: server.name,
      type: server.type,
      reachable: server.reachable,
      enabled: server.enabled,
    }));

    return {
      success: true,
      output: {
        servers,
        count: servers.length,
        message: servers.length > 0 ? `Found ${servers.length} game server(s)` : "No game servers found",
      },
    };
  },
};
