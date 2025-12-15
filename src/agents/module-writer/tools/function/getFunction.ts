import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const getFunction: ToolDefinition = {
  name: 'getFunction',
  description: 'Get details of a specific shared function by ID.',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The function ID to retrieve',
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

    const response = await context.takaroClient.function.functionControllerGetOne(id);

    const func = response.data.data;

    return {
      success: true,
      output: {
        id: func.id,
        name: func.name,
        description: func.description,
        code: func.code,
        versionId: func.versionId,
      },
    };
  },
};
