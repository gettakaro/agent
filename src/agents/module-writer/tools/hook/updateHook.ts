import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const updateHook: ToolDefinition = {
  name: "updateHook",
  description: "Update an existing hook. You can update the name, description, regex, eventType, or function code.",
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The hook ID to update",
      },
      name: {
        type: "string",
        description: "New hook name",
      },
      eventType: {
        type: "string",
        description: "New event type",
        enum: [
          "log",
          "player-connected",
          "player-disconnected",
          "chat-message",
          "player-death",
          "entity-killed",
          "discord-message",
          "role-assigned",
          "role-removed",
          "command-executed",
          "hook-executed",
          "cronjob-executed",
          "currency-added",
          "currency-deducted",
          "player-new-ip-detected",
          "server-status-changed",
        ],
      },
      regex: {
        type: "string",
        description: "New regex pattern",
      },
      function: {
        type: "string",
        description: "New JavaScript code",
      },
      description: {
        type: "string",
        description: "New description",
      },
    },
    required: ["id"],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const id = args.id as string;
    const updateData: Record<string, unknown> = {};

    if (args.name !== undefined) updateData.name = args.name;
    if (args.eventType !== undefined) updateData.eventType = args.eventType;
    if (args.regex !== undefined) updateData.regex = args.regex;
    if (args.function !== undefined) updateData.function = args.function;
    if (args.description !== undefined) updateData.description = args.description;

    const response = await context.takaroClient.hook.hookControllerUpdate(id, updateData as any);

    return {
      success: true,
      output: {
        hookId: response.data.data.id,
        name: response.data.data.name,
        message: `Hook "${response.data.data.name}" updated successfully`,
      },
    };
  },
};
