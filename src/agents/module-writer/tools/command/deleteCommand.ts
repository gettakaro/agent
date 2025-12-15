import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const deleteCommand: ToolDefinition = {
  name: 'deleteCommand',
  description: 'Delete a command from the module.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The command ID to delete',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const id = args.id as string;

    await context.takaroClient.command.commandControllerRemove(id);

    return {
      success: true,
      output: {
        deleted: true,
        commandId: id,
        message: `Command deleted successfully`,
      },
    };
  },
};
