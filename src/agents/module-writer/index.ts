import type { IAgent, IAgentFactory } from '../types.js';
import { AgentRuntime } from '../AgentRuntime.js';
import {
  MODULE_WRITER_EXPERIMENTS,
  DEFAULT_EXPERIMENT,
} from './versions.js';

export class ModuleWriterFactory implements IAgentFactory {
  readonly agentId = 'module-writer';

  createAgent(experimentOrVersion: string): IAgent {
    const config = MODULE_WRITER_EXPERIMENTS[experimentOrVersion];
    if (!config) {
      const available = Object.keys(MODULE_WRITER_EXPERIMENTS).join(', ');
      throw new Error(
        `Unknown experiment '${experimentOrVersion}'. Available: ${available}`
      );
    }
    return new AgentRuntime(this.agentId, experimentOrVersion, config);
  }

  listVersions(): string[] {
    return Object.keys(MODULE_WRITER_EXPERIMENTS);
  }

  getDefaultVersion(): string {
    return DEFAULT_EXPERIMENT;
  }
}
