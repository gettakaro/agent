import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const updateCronJob: ToolDefinition = {
  name: "updateCronJob",
  description: "Update an existing cron job. You can update the name, description, schedule, or function code.",
  parameters: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description: "The cron job ID to update",
      },
      name: {
        type: "string",
        description: "New cron job name",
      },
      temporalValue: {
        type: "string",
        description: "New cron expression",
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
    if (args.temporalValue !== undefined) updateData.temporalValue = args.temporalValue;
    if (args.function !== undefined) updateData.function = args.function;
    if (args.description !== undefined) updateData.description = args.description;

    const response = await context.takaroClient.cronjob.cronJobControllerUpdate(id, updateData as any);

    return {
      success: true,
      output: {
        cronJobId: response.data.data.id,
        name: response.data.data.name,
        message: `Cron job "${response.data.data.name}" updated successfully`,
      },
    };
  },
};
