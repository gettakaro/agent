import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const getHook: ToolDefinition = {
  name: "getHook",
  description: "Get details of a specific hook by ID.",
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The hook ID to retrieve",
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

    const response = await context.takaroClient.hook.hookControllerGetOne(id);

    const hook = response.data.data;

    return {
      success: true,
      output: {
        id: hook.id,
        name: hook.name,
        description: hook.description,
        eventType: hook.eventType,
        regex: hook.regex,
        function: hook.function,
        versionId: hook.versionId,
      },
    };
  },
};
