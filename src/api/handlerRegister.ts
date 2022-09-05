import {
  IAirdropToolMiddlewareRegister,
  AirdropToolHandler,
  AirdropToolResponse,
} from "./common";
import { ErrorCode } from "./error";
import { logger } from "../common/logger";
import { trimObj } from "../utils/utils";

export class AirdropToolHandlerRegister {
  private readonly handlers: Map<string, AirdropToolHandler>;

  constructor(private middleware: IAirdropToolMiddlewareRegister) {
    this.handlers = new Map<string, AirdropToolHandler>();
  }

  register(name: string, handler: AirdropToolHandler) {
    this.handlers.set(
      name,
      async (params: any): Promise<AirdropToolResponse> => {
        params = trimObj(params);
        try {
          const res = await this.middleware.process(params);
          if (res) {
            return res;
          }

          return await handler(params);
        } catch (e) {
          logger.error(
            `AirdropToolHandler name:${name} params:${JSON.stringify(
              params
            )} process error:${e}`
          );
          return AirdropToolResponse.fromError(
            ErrorCode.UnknownError,
            e.toString()
          );
        }
      }
    );
  }

  getHandlers(): Map<string, AirdropToolHandler> {
    return this.handlers;
  }

  getHandler(name: string): AirdropToolHandler | undefined {
    return this.handlers.get(name);
  }
}
