import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const deleteHook: ToolDefinition = {
  name: "deleteHook",
  description: "Delete a hook from the module.",
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The hook ID to delete",
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

    await context.takaroClient.hook.hookControllerRemove(id);

    return {
      success: true,
      output: {
        deleted: true,
        hookId: id,
        message: `Hook deleted successfully`,
      },
    };
  },
};
