/**
 * Safely extract a single string param from Express route params.
 * Returns the string value or undefined if the param is an array.
 */
export function getParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Safely extract a required string param from Express route params.
 * Throws if the param is missing or is an array.
 */
export function requireParam(value: string | string[] | undefined, name: string): string {
  const param = getParam(value);
  if (!param) {
    throw new Error(`Missing required parameter: ${name}`);
  }
  return param;
}
