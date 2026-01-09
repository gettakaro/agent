import { validate as uuidValidate } from "uuid";

/**
 * Validates if a string is a valid UUID format
 */
export function isValidUuid(value: string): boolean {
  return uuidValidate(value);
}

/**
 * Validates UUID and returns error response data if invalid
 * Returns null if valid
 */
export function validateUuidParam(paramName: string, value: string): { error: string } | null {
  if (!isValidUuid(value)) {
    return { error: `Invalid ${paramName} format. Expected a valid UUID.` };
  }
  return null;
}
