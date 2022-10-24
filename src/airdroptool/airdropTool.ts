import { AirdropToolJsonRpcServer } from "../rpc/server";
import {
  airdropConfig,
  config,
  getTaskonNftAidropConfigName,
} from "../common/config";
import { initLog, logger } from "../common/logger";
import { DefaultCore } from "../common/core";
import {
  AIRDROP_REQUEST_CANCELED,
  AIRDROP_REQUEST_COMPLETED,
  AIRDROP_REQUEST_INIT,
  AIRDROP_REQUEST_PENDING,
  AirdropRequest,
} from "../db/entity/airdropRequest";
import { EvmHandler } from "../offchain/evmHandler";
import { AirdropResult } from "../db/entity/airdropResult";
import { pagingOptions, pagingResult } from "../common/common";
import {
  AIRDROP_REQUEST_TYPE_NEW,
  AIRDROP_REQUEST_TYPE_RETRY,
  AirdropRequestNewParams,
  AirdropRequestQueueItem,
  AirdropRequestRetryParams,
} from "./common";
import { foreverPromise } from "../utils/promise";

const nconf = require("nconf");
const defaultConfigPath = "./config.json";

export var GlobalAirdropTool: AirdropTool;

export class AirdropTool {
  private readonly configPath: string;
  private cfg: config;
  private airdropCfg: Map<string, airdropConfig>;
  private jsonRpcServer: AirdropToolJsonRpcServer;
  private evmHandlers: Map<string, EvmHandler>;
  private requestQueue: AirdropRequestQueueItem[];

  constructor(cfgPath?: string) {
    this.jsonRpcServer = new AirdropToolJsonRpcServer();
    this.configPath =
      cfgPath || process.env.AIRDROP_TOOL_CONFIG || defaultConfigPath;
    this.airdropCfg = new Map<string, airdropConfig>();
    this.evmHandlers = new Map<string, EvmHandler>();
    this.requestQueue = new Array<AirdropRequestQueueItem>();
  }

  async init(): Promise<void> {
    this.cfg = await nconf.file(this.configPath).get("AirdropTool");
    if (!this.cfg) {
      console.error(`cannot found config from:${this.configPath}`);
      process.exit(1);
    }
    initLog(this.cfg.log!);

    for (const airdrop of this.cfg.airdrop!) {
      if (
        this.airdropCfg.get(airdrop.airdropName.toLowerCase()) !== undefined
      ) {
        logger.error(
          `duplicate airdrop config:${airdrop.airdropName} category:${airdrop.category} chain:${airdrop.chain} contractAddress:${airdrop.contractAddress}`
        );
        process.exit(1);
      }
      this.airdropCfg.set(airdrop.airdropName.toLowerCase(), airdrop);
      if (
        this.evmHandlers.get(airdrop.airdropName.toLowerCase()) === undefined
      ) {
        const evmHandler = new EvmHandler(airdrop);
        this.evmHandlers.set(airdrop.airdropName.toLowerCase(), evmHandler);
      }
    }
    await DefaultCore.init(this.cfg);
    GlobalAirdropTool = this;
  }

  async start(): Promise<void> {
    await this.init();
    this.checkInQueue();
    this.evmHandlers.forEach((handler) => {
      handler.start();
    });
    this.jsonRpcServer.start(this.cfg.rpcServer?.port!);
    logger.info(`AirdropTool rpc server start at:${this.cfg.rpcServer?.port}`);
  }

  checkInQueue() {
    foreverPromise(
      async (times): Promise<void> => {
        const request = this.requestQueue.shift();
        if (request === undefined) {
          return;
        }
        let params;
        switch (request.type) {
          case AIRDROP_REQUEST_TYPE_NEW:
            params = request.params as AirdropRequestNewParams;
            await this.doNewTaskonNftAirdropRequest(
              params.requestId,
              params.receivers,
              params.limit
            );
            break;
          case AIRDROP_REQUEST_TYPE_RETRY:
            params = request.params as AirdropRequestRetryParams;
            await this.doRetryTaskonNftAirdropRequest(
              params.requestId,
              params.receivers
            );
            break;
        }
      },
      {
        onResolvedInterval: 1000,
        onRejectedInterval: 1000,
      }
    );
  }

  async cancelTaskonNftAirdropRequest(
    requestId: number
  ): Promise<Error | undefined> {
    const request =
      await DefaultCore.airdropRequestDB.getAirdropRequestByRequestId(
        requestId
      );
    if (request === null) {
      return new Error("cannot found airdrop info");
    }
    if (request.status === AIRDROP_REQUEST_COMPLETED) {
      return new Error("airdrop has already completed");
    }
    if (request.status === AIRDROP_REQUEST_CANCELED) {
      return new Error("airdrop has already canceled");
    }
    await DefaultCore.airdropRequestDB.updateAirdropRequest({
      id: requestId,
      airdropName: request.airdropName,
      category: request.category,
      campaignId: request.campaignId,
      chain: request.chain,
      status: AIRDROP_REQUEST_CANCELED,
      contractAddress: request.contractAddress,
      limit: request.limit,
      tokenURI: request.tokenURI,
      startTime: request.startTime,
    });
    return undefined;
  }

  async newTaskonNftAirdropRequest(
    chain: string,
    campaignId: number,
    tokenURI: string,
    receivers: string[],
    limit: number | undefined
  ): Promise<{
    requestId?: number;
    error?: Error;
  }> {
    let requestId = 0;
    const request =
      await DefaultCore.airdropRequestDB.getAirdropRequestByCampaignId(
        campaignId
      );
    if (request) {
      requestId = request.id;
    } else {
      const airdropName = getTaskonNftAidropConfigName(chain);
      const airdropConfig = this.getAirdropConfig(airdropName);
      if (airdropConfig === undefined) {
        return { error: new Error(`invalid chain:${chain}`) };
      }
      let campaignLimit = receivers.length;
      if (limit !== undefined && limit > campaignLimit) {
        campaignLimit = limit;
      }
      requestId = await DefaultCore.airdropRequestDB.newAirdropRequest({
        airdropName: airdropConfig.airdropName,
        campaignId,
        category: airdropConfig.category,
        chain: airdropConfig.chain,
        contractAddress: airdropConfig.contractAddress,
        limit: campaignLimit,
        tokenURI: tokenURI,
        startTime: new Date(),
      });
    }

    this.requestQueue.push({
      type: AIRDROP_REQUEST_TYPE_NEW,
      params: {
        requestId,
        receivers,
        limit,
      },
    });
    return { requestId };
  }

  async retryTaskonNftAirdropRequest(
    requestId: number,
    receivers?: string[]
  ): Promise<Error | undefined> {
    this.requestQueue.push({
      type: AIRDROP_REQUEST_TYPE_RETRY,
      params: {
        requestId: requestId,
        receivers,
      },
    });
    return;
  }

  async doRetryTaskonNftAirdropRequest(
    requestId: number,
    receivers?: string[]
  ): Promise<void> {
    const request =
      await DefaultCore.airdropRequestDB.getAirdropRequestByRequestId(
        requestId
      );
    if (request === null) {
      logger.error(
        "doRetryTaskonNftAirdropRequest cannot found airdropRequest by id:",
        requestId
      );
      return;
    }
    await DefaultCore.airdropResultDB.resetFailedAirdropResults({
      requestId,
      receivers,
    });
    if (request.status === AIRDROP_REQUEST_COMPLETED) {
      request.status = AIRDROP_REQUEST_PENDING;
    }
    await DefaultCore.airdropRequestDB.updateAirdropRequest(request);
    return;
  }

  async doNewTaskonNftAirdropRequest(
    requestId: number,
    receivers: string[],
    limit: number
  ): Promise<void> {
    const request =
      await DefaultCore.airdropRequestDB.getAirdropRequestByRequestId(
        requestId
      );
    if (!request) {
      logger.error(
        "doNewTaskonNftAirdropRequest cannot found airdropRequest by id:",
        requestId
      );
      return;
    }
    await DefaultCore.airdropResultDB.newAirdropResults(
      receivers.map((receiver) => {
        return {
          requestId: request.id,
          receiver,
        };
      })
    );

    const campaignLimit =
      (await DefaultCore.airdropResultDB.getCountOfAirdropResult(request.id)) +
      receivers.length;
    request.limit = limit > campaignLimit ? limit : campaignLimit;

    if (
      request.status === AIRDROP_REQUEST_INIT ||
      request.status === AIRDROP_REQUEST_COMPLETED
    ) {
      request.status = AIRDROP_REQUEST_PENDING;
    }

    await DefaultCore.airdropRequestDB.updateAirdropRequest(request);
    return;
  }

  getAirdropConfig(airdropName: string): airdropConfig | undefined {
    return this.airdropCfg.get(airdropName);
  }

  async getAirdropRequest(params: {
    requestId?: number;
    campaignId?: number;
  }): Promise<AirdropRequest | null> {
    if (params.requestId !== undefined) {
      return DefaultCore.airdropRequestDB.getAirdropRequestByRequestId(
        params.requestId
      );
    }
    if (params.campaignId !== undefined) {
      return DefaultCore.airdropRequestDB.getAirdropRequestByCampaignId(
        params.campaignId
      );
    }
    return null;
  }

  async getAirdropResult(
    requestId: number,
    options: {
      status?: number[];
      receivers?: string[];
      page: pagingOptions;
    }
  ): Promise<{
    data: AirdropResult[];
    page: pagingResult;
  }> {
    return DefaultCore.airdropResultDB.getAirdropResults(requestId, options);
  }

  async getAirdropRequestList(options: {
    airdropName?: string;
    category?: string;
    status?: number[];
    page: pagingOptions;
  }): Promise<{
    data: AirdropRequest[];
    page: pagingResult;
  }> {
    return DefaultCore.airdropRequestDB.getAirdropRequests({
      page: options.page,
      airdropName: options.airdropName,
      category: options.category,
      status: options.status,
    });
  }
}
