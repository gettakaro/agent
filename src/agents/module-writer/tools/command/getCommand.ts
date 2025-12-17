import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const getCommand: ToolDefinition = {
  name: "getCommand",
  description: "Get details of a specific command by ID.",
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The command ID to retrieve",
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

    const response = await context.takaroClient.command.commandControllerGetOne(id);

    const command = response.data.data;

    return {
      success: true,
      output: {
        id: command.id,
        name: command.name,
        trigger: command.trigger,
        helpText: command.helpText,
        function: command.function,
        arguments: command.arguments,
        versionId: command.versionId,
      },
    };
  },
};
