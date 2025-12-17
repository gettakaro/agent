import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const removeRole: ToolDefinition = {
  name: "removeRole",
  description: "Remove a role from a player. Can target global or server-specific role assignments.",
  parameters: {
    type: "object",
    properties: {
      playerId: {
        type: "string",
        description: "The player ID to remove the role from",
      },
      roleId: {
        type: "string",
        description: "The role ID to remove",
      },
      gameServerId: {
        type: "string",
        description: "The game server ID if removing a server-specific role. Omit for global role removal.",
      },
    },
    required: ["playerId", "roleId"],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const playerId = args.playerId as string;
    const roleId = args.roleId as string;

    const removeDto: Record<string, unknown> = {};
    if (args.gameServerId) removeDto.gameServerId = args.gameServerId as string;

    await context.takaroClient.player.playerControllerRemoveRole(playerId, roleId, removeDto as any);

    return {
      success: true,
      output: {
        playerId,
        roleId,
        gameServerId: args.gameServerId || null,
        message: "Role removed successfully",
      },
    };
  },
};
