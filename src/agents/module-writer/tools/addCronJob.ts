import type { ToolDefinition, ToolResult, ToolContext } from '../../types.js';
import type { ModuleState, CronJob } from './index.js';

export const addCronJob: ToolDefinition = {
  name: 'addCronJob',
  description:
    'Add a scheduled cron job to the module. Cron jobs run at specified intervals.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Internal cron job name (unique identifier)',
      },
      temporalValue: {
        type: 'string',
        description:
          'Cron expression (e.g., "*/30 * * * *" for every 30 minutes, "0 0 * * *" for daily at midnight)',
      },
      functionCode: {
        type: 'string',
        description:
          'JavaScript code for the cron job function. Runs on schedule without player context.',
      },
    },
    required: ['name', 'temporalValue', 'functionCode'],
  },
  execute: async (
    args: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> => {
    const moduleState = context.state['module'] as ModuleState | undefined;

    if (!moduleState) {
      return {
        success: false,
        output: null,
        error: 'No module initialized. Call createModule first.',
      };
    }

    const name = args['name'] as string;
    const temporalValue = args['temporalValue'] as string;
    const functionCode = args['functionCode'] as string;

    // Check for duplicate cron job name
    if (moduleState.cronJobs.some((c) => c.name === name)) {
      return {
        success: false,
        output: null,
        error: `Cron job "${name}" already exists`,
      };
    }

    // Basic cron expression validation (5 or 6 parts)
    const cronParts = temporalValue.trim().split(/\s+/);
    if (cronParts.length < 5 || cronParts.length > 6) {
      return {
        success: false,
        output: null,
        error:
          'Invalid cron expression. Expected 5 or 6 space-separated parts (minute, hour, day, month, weekday, [year])',
      };
    }

    const cronJob: CronJob = {
      name,
      temporalValue,
      function: functionCode,
    };

    moduleState.cronJobs.push(cronJob);

    return {
      success: true,
      output: {
        message: `Cron job "${name}" (${temporalValue}) added successfully`,
        cronJob,
      },
    };
  },
};
