import { AgentRuntime } from "../AgentRuntime.js";
import type { IAgent, IAgentFactory } from "../types.js";
import { DEFAULT_EXPERIMENT, getExperimentConfig, listExperiments } from "./versions.js";

export class ModuleWriterFactory implements IAgentFactory {
  readonly agentId = "module-writer";

  createAgent(experimentOrVersion: string): IAgent {
    const config = getExperimentConfig(experimentOrVersion);
    if (!config) {
      const available = listExperiments().join(", ");
      throw new Error(`Unknown experiment '${experimentOrVersion}'. Available: ${available}`);
    }
    return new AgentRuntime(this.agentId, experimentOrVersion, config);
  }

  listVersions(): string[] {
    return listExperiments();
  }

  getDefaultVersion(): string {
    return DEFAULT_EXPERIMENT;
  }
}
