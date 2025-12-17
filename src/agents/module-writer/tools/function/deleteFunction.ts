import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const deleteFunction: ToolDefinition = {
  name: "deleteFunction",
  description: "Delete a shared function from the module.",
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The function ID to delete",
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

    await context.takaroClient.function.functionControllerRemove(id);

    return {
      success: true,
      output: {
        deleted: true,
        functionId: id,
        message: `Function deleted successfully`,
      },
    };
  },
};
