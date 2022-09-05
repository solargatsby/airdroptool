/**
 * Trims object keys and values.
 * @param obj - Object to trim key/values
 */
export function trimObj(obj: any) {
  if (obj === null || (!Array.isArray(obj) && typeof obj !== "object"))
    return obj;

  return Object.keys(obj).reduce(
    (acc: any, key: string) => {
      acc[key.trim()] =
        typeof obj[key] === "string" ? obj[key].trim() : trimObj(obj[key]);
      return acc;
    },
    Array.isArray(obj) ? [] : {}
  );
}
