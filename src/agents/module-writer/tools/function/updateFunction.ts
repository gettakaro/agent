import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const updateFunction: ToolDefinition = {
  name: 'updateFunction',
  description: 'Update an existing shared function. You can update the name, description, or code.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The function ID to update',
      },
      name: {
        type: 'string',
        description: 'New function name',
      },
      code: {
        type: 'string',
        description: 'New JavaScript code',
      },
      description: {
        type: 'string',
        description: 'New description',
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
    if (args.code !== undefined) updateData.code = args.code;
    if (args.description !== undefined) updateData.description = args.description;

    const response = await context.takaroClient.function.functionControllerUpdate(id, updateData as any);

    return {
      success: true,
      output: {
        functionId: response.data.data.id,
        name: response.data.data.name,
        message: `Function "${response.data.data.name}" updated successfully`,
      },
    };
  },
};
