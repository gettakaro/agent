import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const createModule: ToolDefinition = {
  name: 'createModule',
  description:
    'Create a new module in Takaro with an initial version. This must be called first before adding commands, hooks, or cron jobs. The module and version are immediately persisted to Takaro.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Module name (3-50 characters)',
        minLength: 3,
        maxLength: 50,
      },
      description: {
        type: 'string',
        description: 'Description of what the module does',
      },
    },
    required: ['name'],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const name = args.name as string;
    const description = (args.description as string) || '';

    // Create the module - this automatically creates a "latest" version
    const moduleResponse = await context.takaroClient.module.moduleControllerCreate({
      name,
      latestVersion: {
        description,
      },
    });

    const moduleData = moduleResponse.data.data;
    const moduleId = moduleData.id;
    const versionId = moduleData.latestVersion.id;

    // Store in state for subsequent tool calls
    context.state.moduleId = moduleId;
    context.state.versionId = versionId;
    context.state.moduleName = name;

    return {
      success: true,
      output: {
        moduleId,
        versionId,
        name,
        message: `Module "${name}" created successfully`,
      },
    };
  },
};
