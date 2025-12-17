/**
 * Utilities for working with experiment naming conventions.
 *
 * Agent IDs use compound format: {type}/{experiment}
 *   - module-writer/grok-minimal
 *   - module-writer/claude-verbose
 *
 * Stable versions use @ suffix: {type}@{semver}
 *   - module-writer@1.0.0
 *
 * Tool variants use same format: {name}/{variant}
 *   - listModules/filtered
 *   - listModules/concise-response
 */

export interface ParsedAgentId {
  base: string;
  experiment?: string;
  version?: string;
}

export interface ParsedToolId {
  name: string;
  variant?: string;
}

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

/**
 * Parse compound agent ID into components.
 *
 * @example
 * parseAgentId('module-writer/grok-minimal')
 * // → { base: 'module-writer', experiment: 'grok-minimal' }
 *
 * parseAgentId('module-writer@1.0.0')
 * // → { base: 'module-writer', version: '1.0.0' }
 *
 * parseAgentId('module-writer')
 * // → { base: 'module-writer' }
 */
export function parseAgentId(agentId: string): ParsedAgentId {
  if (agentId.includes("@")) {
    const parts = agentId.split("@", 2);
    return { base: parts[0]!, version: parts[1] };
  }

  if (agentId.includes("/")) {
    const parts = agentId.split("/", 2);
    return { base: parts[0]!, experiment: parts[1] };
  }

  return { base: agentId };
}

/**
 * Format components into compound agent ID.
 */
export function formatAgentId(base: string, experimentOrVersion?: string, isVersion = false): string {
  if (!experimentOrVersion) return base;
  return isVersion ? `${base}@${experimentOrVersion}` : `${base}/${experimentOrVersion}`;
}

/**
 * Check if agent ID is an experiment (has / separator).
 */
export function isExperiment(agentId: string): boolean {
  return agentId.includes("/");
}

/**
 * Check if agent ID is a stable version (has @semver).
 */
export function isStable(agentId: string): boolean {
  if (!agentId.includes("@")) return false;
  const version = agentId.split("@")[1] ?? "";
  return SEMVER_REGEX.test(version);
}

/**
 * Parse tool variant identifier.
 *
 * @example
 * parseToolVariant('listModules/filtered')
 * // → { name: 'listModules', variant: 'filtered' }
 *
 * parseToolVariant('createModule')
 * // → { name: 'createModule' }
 */
export function parseToolVariant(toolId: string): ParsedToolId {
  if (toolId.includes("/")) {
    const parts = toolId.split("/", 2);
    return { name: parts[0]!, variant: parts[1] };
  }
  return { name: toolId };
}

/**
 * Format tool name with variant.
 */
export function formatToolVariant(name: string, variant?: string): string {
  return variant ? `${name}/${variant}` : name;
}

/**
 * Get full identifier for a tool (name + variant if present).
 */
export function getToolId(tool: { name: string; variant?: string }): string {
  return formatToolVariant(tool.name, tool.variant);
}
