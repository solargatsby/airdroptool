export class AirdropToolError {
  Code: ErrorCode;
  Message: string;

  constructor(code: ErrorCode, message?: string) {
    this.Code = code;
    if (message) {
      this.Message = message;
      return;
    }
    message = errMessages.get(code);
    if (message) {
      this.Message = message;
    }
  }
}

export enum ErrorCode {
  Ok = 0,
  InvalidParams = 1000,
  UnknownError = 9999,
}

const errMessages = new Map([
  [ErrorCode.Ok, "ok"],
  [ErrorCode.InvalidParams, "invalid params"],
  [ErrorCode.UnknownError, "unknown error"],
]);

export const ErrorOk = new AirdropToolError(ErrorCode.Ok);
