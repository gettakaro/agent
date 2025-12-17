import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const searchPlayers: ToolDefinition = {
  name: "searchPlayers",
  description:
    "Search for players. Useful for finding player IDs needed to test commands. Can search by name, steamId, or other identifiers.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Search by player name (partial match)",
      },
      steamId: {
        type: "string",
        description: "Filter by Steam ID",
      },
      gameId: {
        type: "string",
        description: "Filter by game-specific ID",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 20)",
      },
    },
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const searchParams: Record<string, unknown> = {
      limit: (args.limit as number) || 20,
    };

    if (args.name) {
      searchParams.search = { name: [args.name as string] };
    }

    const filters: Record<string, string[]> = {};
    if (args.steamId) filters.steamId = [args.steamId as string];
    if (args.gameId) filters.gameId = [args.gameId as string];

    if (Object.keys(filters).length > 0) {
      searchParams.filters = filters;
    }

    const response = await context.takaroClient.player.playerControllerSearch(searchParams as any);

    const players = response.data.data.map((player) => ({
      id: player.id,
      name: player.name,
      steamId: player.steamId,
      epicOnlineServicesId: player.epicOnlineServicesId,
      xboxLiveId: player.xboxLiveId,
    }));

    return {
      success: true,
      output: {
        players,
        count: players.length,
        message: `Found ${players.length} player(s)`,
      },
    };
  },
};
