import { AgentRuntime } from "../AgentRuntime.js";
import type { IAgent, IAgentFactory } from "../types.js";
import { DEFAULT_EXPERIMENT, PLAYER_MODERATOR_EXPERIMENTS } from "./versions.js";

export class PlayerModeratorFactory implements IAgentFactory {
  readonly agentId = "player-moderator";

  createAgent(experimentOrVersion: string): IAgent {
    const config = PLAYER_MODERATOR_EXPERIMENTS[experimentOrVersion];
    if (!config) {
      const available = Object.keys(PLAYER_MODERATOR_EXPERIMENTS).join(", ");
      throw new Error(`Unknown experiment '${experimentOrVersion}'. Available: ${available}`);
    }
    return new AgentRuntime(this.agentId, experimentOrVersion, config);
  }

  listVersions(): string[] {
    return Object.keys(PLAYER_MODERATOR_EXPERIMENTS);
  }

  getDefaultVersion(): string {
    return DEFAULT_EXPERIMENT;
  }
}
