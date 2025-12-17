import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const assignRole: ToolDefinition = {
  name: "assignRole",
  description: "Assign a role to a player. Can be global or server-specific, permanent or temporary.",
  parameters: {
    type: "object",
    properties: {
      playerId: {
        type: "string",
        description: "The player ID to assign the role to",
      },
      roleId: {
        type: "string",
        description: "The role ID to assign (use searchRoles to find it)",
      },
      gameServerId: {
        type: "string",
        description: "The game server ID for server-specific role. Omit for global assignment.",
      },
      expiresAt: {
        type: "string",
        description: "ISO date string for when the role expires. Omit for permanent assignment.",
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

    const assignDto: Record<string, unknown> = {};
    if (args.gameServerId) assignDto.gameServerId = args.gameServerId as string;
    if (args.expiresAt) assignDto.expiresAt = args.expiresAt as string;

    await context.takaroClient.player.playerControllerAssignRole(playerId, roleId, assignDto as any);

    return {
      success: true,
      output: {
        playerId,
        roleId,
        gameServerId: args.gameServerId || null,
        expiresAt: args.expiresAt || null,
        message: args.expiresAt ? `Role assigned until ${args.expiresAt}` : "Role assigned permanently",
      },
    };
  },
};
