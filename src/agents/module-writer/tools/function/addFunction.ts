import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const addFunction: ToolDefinition = {
  name: "addFunction",
  description:
    "Add a shared function to the current module version. Functions contain reusable code that can be imported by commands, hooks, and cron jobs. Requires createModule to be called first.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Function name (used as identifier)",
      },
      code: {
        type: "string",
        description: "JavaScript code for the shared function",
      },
      description: {
        type: "string",
        description: "Description of what this function does",
      },
    },
    required: ["name", "code"],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const versionId = context.state.versionId as string | undefined;
    if (!versionId) {
      return {
        success: false,
        output: null,
        error: "No module version found. Call createModule first.",
      };
    }

    const name = args.name as string;
    const code = args.code as string;
    const description = args.description as string | undefined;

    const response = await context.takaroClient.function.functionControllerCreate({
      name,
      code,
      versionId,
      description,
    });

    const functionId = response.data.data.id;

    return {
      success: true,
      output: {
        functionId,
        name,
        message: `Function "${name}" added successfully`,
      },
    };
  },
};
