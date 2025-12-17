import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const getPlayer: ToolDefinition = {
  name: "getPlayer",
  description:
    "Get detailed information about a specific player, including their roles and identifiers. Use searchPlayers first to find the player ID.",
  parameters: {
    type: "object",
    properties: {
      playerId: {
        type: "string",
        description: "The player ID to look up",
      },
    },
    required: ["playerId"],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const playerId = args.playerId as string;

    const response = await context.takaroClient.player.playerControllerGetOne(playerId);

    const player = response.data.data;

    return {
      success: true,
      output: {
        id: player.id,
        name: player.name,
        steamId: player.steamId,
        epicOnlineServicesId: player.epicOnlineServicesId,
        xboxLiveId: player.xboxLiveId,
        createdAt: player.createdAt,
        updatedAt: player.updatedAt,
        roleAssignments: player.roleAssignments?.map((ra) => ({
          roleId: ra.roleId,
          roleName: ra.role?.name,
          gameServerId: ra.gameServerId,
          expiresAt: ra.expiresAt,
        })),
      },
    };
  },
};
