import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const getOnlinePlayers: ToolDefinition = {
  name: "getOnlinePlayers",
  description: "Get list of players currently online on a game server. Useful for testing commands on real players.",
  parameters: {
    type: "object",
    properties: {
      gameServerId: {
        type: "string",
        description: "The game server ID to get online players from",
      },
    },
    required: ["gameServerId"],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const gameServerId = args.gameServerId as string;

    const response = await context.takaroClient.gameserver.gameServerControllerGetPlayers(gameServerId);
    // Note: The API returns an array but TypeScript types say single object. Cast to work around.
    const players = response.data.data as unknown as Array<{
      gameId: string;
      name: string;
      steamId?: string;
      epicOnlineServicesId?: string;
      xboxLiveId?: string;
      ping?: number;
      ip?: string;
    }>;

    return {
      success: true,
      output: {
        players: players.map((player) => ({
          gameId: player.gameId,
          name: player.name,
          steamId: player.steamId,
          epicOnlineServicesId: player.epicOnlineServicesId,
          xboxLiveId: player.xboxLiveId,
          ping: player.ping,
          ip: player.ip,
        })),
        count: players.length,
        message: `Found ${players.length} online player(s)`,
      },
    };
  },
};
