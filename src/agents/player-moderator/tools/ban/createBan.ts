import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const createBan: ToolDefinition = {
  name: "createBan",
  description:
    "Ban a player. Can be server-specific or global, temporary or permanent. For temporary bans, provide an expiration date.",
  parameters: {
    type: "object",
    properties: {
      playerId: {
        type: "string",
        description: "The player ID to ban",
      },
      reason: {
        type: "string",
        description: "Reason for the ban (shown to player)",
      },
      gameServerId: {
        type: "string",
        description: "The game server to ban from. Omit for global ban.",
      },
      isGlobal: {
        type: "boolean",
        description: "Whether this is a global ban across all servers (default: false)",
      },
      until: {
        type: "string",
        description: "ISO date string for when the ban expires. Omit for permanent ban.",
      },
    },
    required: ["playerId"],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const banDto: Record<string, unknown> = {
      playerId: args.playerId as string,
      takaroManaged: true,
    };

    if (args.reason) banDto.reason = args.reason as string;
    if (args.gameServerId) banDto.gameServerId = args.gameServerId as string;
    if (args.isGlobal !== undefined) banDto.isGlobal = args.isGlobal as boolean;
    if (args.until) banDto.until = args.until as string;

    const response = await context.takaroClient.player.banControllerCreate(banDto as any);

    const ban = response.data.data;

    return {
      success: true,
      output: {
        banId: ban.id,
        playerId: ban.playerId,
        gameServerId: ban.gameServerId,
        isGlobal: ban.isGlobal,
        reason: ban.reason,
        until: ban.until,
        createdAt: ban.createdAt,
        message: ban.until ? `Player banned until ${ban.until}` : "Player permanently banned",
      },
    };
  },
};
