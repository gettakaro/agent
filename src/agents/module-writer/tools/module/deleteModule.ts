import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const deleteModule: ToolDefinition = {
  name: 'deleteModule',
  description: 'Delete a module entirely. This will also remove all installations of this module from game servers.',
  parameters: {
    type: 'object',
    properties: {
      moduleId: {
        type: 'string',
        description: 'The module ID to delete',
      },
    },
    required: ['moduleId'],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const moduleId = args.moduleId as string;

    await context.takaroClient.module.moduleControllerRemove(moduleId);

    // Clear state if this was the current module
    if (context.state.moduleId === moduleId) {
      delete context.state.moduleId;
      delete context.state.versionId;
    }

    return {
      success: true,
      output: {
        deleted: true,
        moduleId,
        message: `Module deleted successfully`,
      },
    };
  },
};
