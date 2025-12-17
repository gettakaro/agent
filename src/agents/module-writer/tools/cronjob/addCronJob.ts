import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const addCronJob: ToolDefinition = {
  name: "addCronJob",
  description:
    "Add a cron job to the current module version. Cron jobs run on a schedule defined by a cron expression. Requires createModule to be called first.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Internal cron job name (used as identifier)",
      },
      temporalValue: {
        type: "string",
        description: 'Cron expression (e.g., "*/30 * * * *" for every 30 minutes, "0 * * * *" for every hour)',
      },
      function: {
        type: "string",
        description:
          "JavaScript code that executes on schedule. Has access to takaro, data (with gameServerId, module), and TakaroUserError from @takaro/helpers.",
      },
      description: {
        type: "string",
        description: "Description of what this cron job does",
      },
    },
    required: ["name", "temporalValue", "function"],
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
    const temporalValue = args.temporalValue as string;
    const functionCode = args.function as string;
    const description = args.description as string | undefined;

    const response = await context.takaroClient.cronjob.cronJobControllerCreate({
      name,
      temporalValue,
      versionId,
      function: functionCode,
      description,
    });

    const cronJobId = response.data.data.id;

    return {
      success: true,
      output: {
        cronJobId,
        name,
        temporalValue,
        message: `Cron job "${name}" added successfully with schedule "${temporalValue}"`,
      },
    };
  },
};
