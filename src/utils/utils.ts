/**
 * Trims object keys and values.
 * @param obj - Object to trim key/values
 */
import { DefaultPageSize, MaxPageSize, pagingOptions } from "../common/common";

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

export function normalizePageOptions(
  page: pagingOptions | undefined
): pagingOptions {
  if (page === undefined) {
    page = {
      pageNo: 0,
      size: DefaultPageSize,
    };
  } else {
    if (page.pageNo < 0) {
      page.pageNo = 0;
    }
    if (page.size > MaxPageSize) {
      page.size = MaxPageSize;
    }
  }
  return page;
}

export function notUndefinedAll(...objs: any): Boolean {
  for (const obj of objs) {
    if (obj === undefined || obj === null) {
      return false;
    }
  }
  return true;
}

export function notUndefinedOne(...objs: any): Boolean {
  for (const obj of objs) {
    if (obj !== undefined && obj !== null) {
      return true;
    }
  }
  return false;
}
