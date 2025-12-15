import type { ToolDefinition, ToolResult, ToolContext } from '../../../types.js';

export const triggerCronJob: ToolDefinition = {
  name: 'triggerCronJob',
  description: 'Trigger a cron job for testing purposes. Simulates the scheduled execution.',
  parameters: {
    type: 'object',
    properties: {
      gameServerId: {
        type: 'string',
        description: 'The game server ID where the cron job should be triggered',
      },
      moduleId: {
        type: 'string',
        description: 'The module ID containing the cron job',
      },
      cronjobId: {
        type: 'string',
        description: 'The cron job ID to trigger',
      },
    },
    required: ['gameServerId', 'moduleId', 'cronjobId'],
    additionalProperties: false,
  },
  execute: async (args, context: ToolContext): Promise<ToolResult> => {
    if (!context.takaroClient) {
      return { success: false, output: null, error: 'No Takaro client available' };
    }

    const gameServerId = args.gameServerId as string;
    const moduleId = args.moduleId as string;
    const cronjobId = args.cronjobId as string;

    await context.takaroClient.cronjob.cronJobControllerTrigger({
      gameServerId,
      moduleId,
      cronjobId,
    });

    return {
      success: true,
      output: {
        triggered: true,
        gameServerId,
        moduleId,
        cronjobId,
        message: `Cron job triggered successfully. Check searchEvents for execution results.`,
      },
    };
  },
};
