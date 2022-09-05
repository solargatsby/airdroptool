import { ErrorCode, ErrorOk, AirdropToolError } from "./error";

export declare type AirdropToolHandler = (
  params: any
) => Promise<AirdropToolResponse>;

export interface IAirdropToolHandlerRegister {
  register(name: string, handler: AirdropToolHandler);
  getHandlers(): Map<string, AirdropToolHandler>;
  getHandler(name: string): AirdropToolHandler | undefined;
}

// if a middleware action return an undefined AirdropToolResponse,
// the action chain will stop, a return the AirdropToolResponse to the request.
export declare type AirdropToolMiddlewareAction = (
  params: any
) => Promise<AirdropToolResponse | undefined>;

export interface IAirdropToolMiddlewareRegister {
  register(action: AirdropToolMiddlewareAction);
  process(params: any): Promise<AirdropToolResponse | undefined>;
}

export class AirdropToolResponse {
  Data?: any;
  Error: AirdropToolError;

  constructor(error?: AirdropToolError, data?: any) {
    if (error) {
      this.Error = error;
    } else {
      this.Error = ErrorOk;
    }
    if (data != undefined) {
      this.Data = data;
    }
  }

  static fromError(code: ErrorCode, message?: string): AirdropToolResponse {
    return new AirdropToolResponse(new AirdropToolError(code, message));
  }

  static fromData(data: any): AirdropToolResponse {
    return new AirdropToolResponse(ErrorOk, data);
  }
}

export interface pagingOptions {
  pageNo: number;
  size: number;
}

export interface pagingResult extends pagingOptions {
  total: number;
}

export const DefaultPageSize = 30;
export const MaxPageSize = 100;
