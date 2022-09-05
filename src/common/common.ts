export interface pagingOptions {
  pageNo: number;
  size: number;
}

export interface pagingResult extends pagingOptions {
  total: number;
}

export const DefaultPageSize = 30;
export const MaxPageSize = 100;
