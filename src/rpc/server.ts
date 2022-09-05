import {
  JSONRPCErrorResponse,
  JSONRPCResponse,
  JSONRPCServer,
  JSONRPCSuccessResponse,
} from "json-rpc-2.0";
import express from "express";
import cors from "cors";
import { JSONRPC } from "json-rpc-2.0";
import bodyParser from "body-parser";
import { logger } from "../common/logger";
import {
  IAirdropToolHandlerRegister,
  AirdropToolResponse,
} from "../api/common";
import { getDefaultHandlerRegister } from "../api/handler/handler";
import { ErrorCode } from "../api/error";

export const apiPath = "/airdroptool/api/v1";

export class AirdropToolJsonRpcServer {
  private server: express;
  private rpcServer: JSONRPCServer;
  private handlers: IAirdropToolHandlerRegister;

  constructor(handlers?: IAirdropToolHandlerRegister) {
    this.server = express();
    this.server.use(bodyParser.json());

    this.rpcServer = new JSONRPCServer();
    if (handlers) {
      this.handlers = handlers;
    } else {
      this.handlers = getDefaultHandlerRegister();
    }

    this.initServer();
    this.initHandler();
  }

  initServer(): void {
    this.server.post(apiPath, cors(), (req, res) => {
      const jsonRPCRequest = req.body;
      logger.info(
        `AirdropToolJsonRpcServer request method:${
          req.method
        }, body:${JSON.stringify(req.body)}`
      );

      this.rpcServer.receive(jsonRPCRequest).then(
        (jsonRPCResponse: JSONRPCResponse) => {
          if (!jsonRPCResponse) {
            logger.error(
              `AirdropToolJsonRpcServer Error: jsonRPCResponse is null. Request:${JSON.stringify(
                jsonRPCRequest
              )}`
            );
            res.sendStatus(204);
            return;
          }

          let response: JSONRPCSuccessResponse | JSONRPCErrorResponse;
          if (jsonRPCResponse.error) {
            response = jsonRPCResponse as JSONRPCErrorResponse;
            logger.info(
              `AirdropToolJsonRpcServer request:${JSON.stringify(
                jsonRPCRequest
              )} handled error, result:${JSON.stringify(response.error)}`
            );
          } else {
            const rpcSuccessRsp = jsonRPCResponse as JSONRPCResponse;
            const podDBRsp = rpcSuccessRsp.result as AirdropToolResponse;
            if (podDBRsp.Error.Code === ErrorCode.Ok) {
              jsonRPCResponse.result = podDBRsp.Data;
              response = jsonRPCResponse;
              logger.info(
                `AirdropToolJsonRpcServer request:${JSON.stringify(
                  jsonRPCRequest
                )} handled success, result:${JSON.stringify(podDBRsp.Data)}`
              );
            } else {
              response = {
                jsonrpc: JSONRPC,
                id: jsonRPCResponse.id,
                error: {
                  code: podDBRsp.Error.Code,
                  message: podDBRsp.Error.Message,
                },
              } as JSONRPCErrorResponse;
              logger.info(
                `AirdropToolJsonRpcServer request:${JSON.stringify(
                  jsonRPCRequest
                )} handled failed, result:${JSON.stringify(podDBRsp.Error)}`
              );
            }
          }

          res.json(response);
        },
        (reason) => {
          logger.error(
            `AirdropToolJsonRpcServer handler request:${JSON.stringify(
              jsonRPCRequest
            )} rejected, reason:${reason}`
          );
          res.sendStatus(500);
        }
      );
    });
  }

  initHandler(): void {
    this.handlers.getHandlers().forEach((handler, name) => {
      this.rpcServer.addMethod(name, async (params) => {
        return await handler(params);
      });
    });
  }

  start(port: number): void {
    this.server.use(cors());
    this.server.listen(port);
    logger.info(`AirdropToolJsonRpcServer start on:${port} ...`);
  }
}
