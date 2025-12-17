import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const searchCronJobs: ToolDefinition = {
  name: "searchCronJobs",
  description: "Search for cron jobs. Can filter by moduleId, versionId, or name.",
  parameters: {
    type: "object",
    properties: {
      moduleId: {
        type: "string",
        description: "Filter by module ID",
      },
      versionId: {
        type: "string",
        description: "Filter by version ID",
      },
      name: {
        type: "string",
        description: "Filter by cron job name",
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default: 100)",
      },
    },
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const searchParams: Record<string, unknown> = {};
    const filters: Record<string, string[]> = {};

    if (args.moduleId) filters.moduleId = [args.moduleId as string];
    if (args.versionId) filters.versionId = [args.versionId as string];
    if (args.name) filters.name = [args.name as string];

    if (Object.keys(filters).length > 0) {
      searchParams.filters = filters;
    }
    if (args.limit) searchParams.limit = args.limit;

    const response = await context.takaroClient.cronjob.cronJobControllerSearch(searchParams as any);

    const cronJobs = response.data.data.map((cronJob) => ({
      id: cronJob.id,
      name: cronJob.name,
      temporalValue: cronJob.temporalValue,
      description: cronJob.description,
      versionId: cronJob.versionId,
    }));

    return {
      success: true,
      output: {
        cronJobs,
        count: cronJobs.length,
        message: `Found ${cronJobs.length} cron job(s)`,
      },
    };
  },
};
