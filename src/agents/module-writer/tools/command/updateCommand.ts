import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const updateCommand: ToolDefinition = {
  name: 'updateCommand',
  description: 'Update an existing command. You can update the name, trigger, description, function code, or arguments.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The command ID to update',
      },
      name: {
        type: 'string',
        description: 'New command name',
      },
      trigger: {
        type: 'string',
        description: 'New trigger (what players type without /)',
      },
      function: {
        type: 'string',
        description: 'New JavaScript code',
      },
      helpText: {
        type: 'string',
        description: 'New help text',
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
    const updateData: Record<string, unknown> = {};

    if (args.name !== undefined) updateData.name = args.name;
    if (args.trigger !== undefined) updateData.trigger = args.trigger;
    if (args.function !== undefined) updateData.function = args.function;
    if (args.helpText !== undefined) updateData.helpText = args.helpText;

    const response = await context.takaroClient.command.commandControllerUpdate(id, updateData as any);

    return {
      success: true,
      output: {
        commandId: response.data.data.id,
        name: response.data.data.name,
        trigger: response.data.data.trigger,
        message: `Command "${response.data.data.name}" updated successfully`,
      },
    };
  },
};
