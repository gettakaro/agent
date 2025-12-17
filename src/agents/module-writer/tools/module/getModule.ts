import type { ToolContext, ToolDefinition, ToolResult } from "../../../types.js";

export const getModule: ToolDefinition = {
  name: "getModule",
  description:
    "Get detailed information about a module including all its components (commands, hooks, cronjobs, functions).",
  parameters: {
    type: "object",
    properties: {
      moduleId: {
        type: "string",
        description: "The module ID to retrieve",
      },
    },
    required: ["moduleId"],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: "No Takaro client available" };
    }

    const moduleId = args.moduleId as string;

    const response = await context.takaroClient.module.moduleControllerGetOne(moduleId);
    const moduleData = response.data.data;

    return {
      success: true,
      output: {
        id: moduleData.id,
        name: moduleData.name,
        builtin: moduleData.builtin,
        latestVersion: {
          id: moduleData.latestVersion.id,
          description: moduleData.latestVersion.description,
          configSchema: moduleData.latestVersion.configSchema,
          uiSchema: moduleData.latestVersion.uiSchema,
          commands: moduleData.latestVersion.commands?.map((cmd) => ({
            id: cmd.id,
            name: cmd.name,
            trigger: cmd.trigger,
            helpText: cmd.helpText,
          })),
          hooks: moduleData.latestVersion.hooks?.map((hook) => ({
            id: hook.id,
            name: hook.name,
            eventType: hook.eventType,
            regex: hook.regex,
          })),
          cronJobs: moduleData.latestVersion.cronJobs?.map((cron) => ({
            id: cron.id,
            name: cron.name,
            temporalValue: cron.temporalValue,
          })),
          functions: moduleData.latestVersion.functions?.map((fn) => ({
            id: fn.id,
            name: fn.name,
          })),
        },
      },
    };
  },
};
