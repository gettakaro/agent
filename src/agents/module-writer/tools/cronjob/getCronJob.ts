import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const getCronJob: ToolDefinition = {
  name: "getCronJob",
  description: "Get details of a specific cron job by ID.",
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The cron job ID to retrieve",
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

    const response = await context.takaroClient.cronjob.cronJobControllerGetOne(id);

    const cronJob = response.data.data;

    return {
      success: true,
      output: {
        id: cronJob.id,
        name: cronJob.name,
        description: cronJob.description,
        temporalValue: cronJob.temporalValue,
        function: cronJob.function,
        versionId: cronJob.versionId,
      },
    };
  },
};
