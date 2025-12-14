import type { ToolDefinition } from '../../types.js';
import { createModule } from './createModule.js';
import { addCommand } from './addCommand.js';
import { addHook } from './addHook.js';
import { addCronJob } from './addCronJob.js';
import { addFunction } from './addFunction.js';
import { addPermission } from './addPermission.js';
import { setConfigSchema } from './setConfigSchema.js';
import { validateModule } from './validateModule.js';
import { exportModule } from './exportModule.js';

export const moduleWriterTools: ToolDefinition[] = [
  createModule,
  addCommand,
  addHook,
  addCronJob,
  addFunction,
  addPermission,
  setConfigSchema,
  validateModule,
  exportModule,
];

// Module state type
export interface ModuleState {
  name: string;
  description: string;
  author: string;
  supportedGames: string[];
  commands: Command[];
  hooks: Hook[];
  cronJobs: CronJob[];
  functions: ModuleFunction[];
  permissions: Permission[];
  configSchema: Record<string, unknown> | null;
}

export interface Command {
  name: string;
  trigger: string;
  helpText: string;
  function: string;
  arguments: CommandArgument[];
  requiredPermissions: string[];
}

export interface CommandArgument {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'player';
  helpText?: string;
  defaultValue?: string;
  position: number;
}

export interface Hook {
  name: string;
  eventType: string;
  function: string;
  regex?: string;
}

export interface CronJob {
  name: string;
  temporalValue: string;
  function: string;
}

export interface ModuleFunction {
  name: string;
  function: string;
}

export interface Permission {
  permission: string;
  friendlyName: string;
  description: string;
  canHaveCount?: boolean;
}
