import { ethers, ContractTransaction, BigNumber } from "ethers";
import { readFileSync } from "fs";
import { foreverPromise, retryPromise } from "../utils/promise";
import { logger } from "../common/logger";
import { DefaultCore } from "../common/core";
import {
  AIRDROP_REQUEST_CANCELED,
  AIRDROP_REQUEST_COMPLETED,
  AIRDROP_REQUEST_INIT,
  AIRDROP_REQUEST_PENDING,
  AIRDROP_REQUEST_PROCESSING,
  AirdropRequest,
} from "../db/entity/airdropRequest";
import {
  AIRDROP_RESULT_FAILED,
  AIRDROP_RESULT_INIT,
  AIRDROP_RESULT_PENDING,
  AIRDROP_RESULT_PROCESSING,
  AIRDROP_RESULT_SUCCESS,
  AirdropResult,
} from "../db/entity/airdropResult";
import { airdropConfig } from "../common/config";
import { IAirdropRequest } from "../db/model/IAirdropRequest";

export class EvmHandler {
  public handlerName: string;
  public chain: string;
  public provider: ethers.providers.JsonRpcProvider;
  public wallet: ethers.Wallet;
  public contract: ethers.Contract;
  public iface: ethers.utils.Interface;

  constructor(public cfg: airdropConfig) {
    this.handlerName = cfg.airdropName;
    this.chain = cfg.chain.toLowerCase();
    this.provider = new ethers.providers.JsonRpcProvider(cfg.rpc);
    this.wallet = new ethers.Wallet(cfg.privateKey).connect(this.provider);
    const abi = readFileSync(cfg.abiPath).toString("utf8");
    this.contract = new ethers.Contract(cfg.contractAddress, abi, this.wallet);
    this.iface = new ethers.utils.Interface(abi);
  }

  start(): void {
    this.handlerAirdropRequest();
  }

  handlerAirdropRequest(): void {
    foreverPromise(
      async (times) => {
        const request = await DefaultCore.airdropRequestDB.takeAirdropRequest(
          this.handlerName
        );
        if (request === null) {
          return;
        }
        await this.airdrop(request);
      },
      {
        onRejectedInterval: 5000,
        onResolvedInterval: 5000,
        onRejected: function (err) {
          logger.error(`loadAirdropRequest error:${err}`);
        },
      }
    );
  }

  async airdrop(request: AirdropRequest): Promise<void> {
    logger.info(
      `EvmHandler airdrop start requestId:${request.id} airdropName:${this.cfg.airdropName} campaignId:${request.campaignId} chain:${request.chain} contractAddress:${request.contractAddress}`
    );

    if (request.status === AIRDROP_REQUEST_PENDING) {
      request.status = AIRDROP_REQUEST_PROCESSING;
      await DefaultCore.airdropRequestDB.updateAirdropRequest(request);
    }

    const pageNo = 0;
    const pageSize = 35; //bath size for a tx
    while (true) {
      const requestNow =
        await DefaultCore.airdropRequestDB.getAirdropRequestByRequestId(
          request.id
        );
      request = requestNow!;
      if (request.status === AIRDROP_REQUEST_CANCELED) {
        logger.info(
          `EvmHandler airdrop canceled requestId:${request.id} airdropName:${this.cfg.airdropName} campaignId:${request.campaignId} chain:${request.chain} contractAddress:${request.contractAddress}`
        );
        return;
      }

      let airdropResults = await DefaultCore.airdropResultDB.getAirdropResults(
        request.id,
        {
          status: [
            AIRDROP_RESULT_INIT,
            AIRDROP_RESULT_PENDING,
            AIRDROP_RESULT_PROCESSING,
          ],
          page: {
            pageNo,
            size: pageSize,
          },
        }
      );

      if (airdropResults.data.length === 0) {
        request.status = AIRDROP_REQUEST_COMPLETED;
        await DefaultCore.airdropRequestDB.updateAirdropRequest(request);
        logger.info(
          `EvmHandler airdrop complete requestId:${request.id} airdropName:${this.cfg.airdropName} campaignId:${request.campaignId} chain:${request.chain}`
        );
        break;
      }

      await this.processAirdrop(request, airdropResults.data);
    }
  }

  async processAirdrop(
    request: AirdropRequest,
    results: AirdropResult[]
  ): Promise<void> {
    if (results.length === 0) {
      return;
    }

    const pending = new Array<AirdropResult>();
    const processing = new Array<AirdropResult>();
    for (const result of results) {
      switch (result.status) {
        case AIRDROP_RESULT_INIT:
          pending.push(result);
          break;
        case AIRDROP_RESULT_PENDING:
          pending.push(result);
          break;
        case AIRDROP_RESULT_PROCESSING:
          processing.push(result);
          break;
      }
    }

    await this.processNewAirdrop(request, pending);
    await this.processOldAirdrop(request, processing);
  }

  async processNewAirdrop(
    request: AirdropRequest,
    results: AirdropResult[]
  ): Promise<void> {
    if (results.length === 0) {
      return;
    }
    const receivers = results.map((result) => {
      return result.receiver;
    });

    let txHash = "";
    let tx;
    let retryTimes = 3;
    await retryPromise(
      async () => {
        tx = await this.taskonNftMint(request, receivers);
        txHash = tx.hash;
        logger.info(
          `sendTx taskonNftMint, txHash:${txHash} requestId:${request.id} airdropName:${request.airdropName}`
        );
      },
      {
        onRejected: async (err, times) => {
          logger.error(
            `sendTx taskonNftMint requestId:${request.id} airdropName:${this.cfg.airdropName} campaignId:${request.campaignId} error:${err}`
          );
          if (times === retryTimes) {
            await DefaultCore.airdropResultDB.updateAirdropResults(
              request.id,
              AIRDROP_RESULT_FAILED,
              txHash,
              `${err}`,
              receivers
            );
          }
        },
        onRejectedInterval: 5000,
        maxRetryTimes: retryTimes,
      }
    );

    if (txHash === "") {
      return;
    }

    await DefaultCore.airdropResultDB.updateAirdropResults(
        request.id,
        AIRDROP_RESULT_PROCESSING,
        txHash,
        '',
        receivers
    )

    await tx.wait();

    const { status, errorMsg } = await this.getTransactionReceipt(
      request,
      txHash
    );
    await DefaultCore.airdropResultDB.updateAirdropResults(
      request.id,
      status,
      txHash,
      errorMsg,
      receivers
    );
  }

  async processOldAirdrop(
    request: AirdropRequest,
    results: AirdropResult[]
  ): Promise<void> {
    if (results.length === 0) {
      return;
    }

    const txHashReceivers = new Map<string, string[]>();
    for (const result of results) {
      let receivers = txHashReceivers.get(result.txHash);
      if (!receivers) {
        receivers = new Array<string>();
      }
      receivers.push(result.receiver);
      txHashReceivers.set(result.txHash, receivers);
    }

    for (const [txHash, receivers] of txHashReceivers) {
      const { status, errorMsg } = await this.getTransactionReceipt(
        request,
        txHash
      );
      await DefaultCore.airdropResultDB.updateAirdropResults(
        request.id,
        status,
        txHash,
        errorMsg,
        receivers
      );
    }
  }

  async getGasPrice(): Promise<{
    gasPrice: BigNumber | null;
    maxFeePerGas: BigNumber | null;
    maxPriorityFeePerGas: BigNumber | null;
  }> {
    let { gasPrice, maxFeePerGas, maxPriorityFeePerGas } =
      await this.provider.getFeeData();

    let supportedEIP1559 = false;
    if (maxFeePerGas !== null) {
      maxFeePerGas = maxFeePerGas.mul(2).div(10).add(maxFeePerGas);
    }
    if (maxPriorityFeePerGas !== null) {
      maxPriorityFeePerGas = maxPriorityFeePerGas
        .mul(2)
        .div(10)
        .add(maxPriorityFeePerGas);
      supportedEIP1559 = true;
    }

    if (supportedEIP1559) {
      gasPrice = null;
    } else {
      if (gasPrice !== null) {
        gasPrice = gasPrice.mul(2).div(10).add(gasPrice);
      }
    }
    return {
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  }

  async taskonNftMint(
    request: IAirdropRequest,
    receivers: string[]
  ): Promise<ContractTransaction> {
    const gasPrice = await this.getGasPrice();
    return await this.contract.batchAirdrop(
      request.campaignId,
      request.limit,
      receivers,
      request.tokenURI,
      {
        ...gasPrice,
      }
    );
  }

  async getTransactionReceipt(
    request: AirdropRequest,
    txHash: string
  ): Promise<{
    status: number;
    errorMsg: string;
    receipt: ethers.providers.TransactionReceipt;
  }> {
    let retryTimes = 90;
    let errorMsg = "";
    let status = AIRDROP_RESULT_FAILED;
    let receipt;
    await retryPromise(
      async () => {
        receipt = await this.provider.getTransactionReceipt(txHash);
        status = AIRDROP_RESULT_SUCCESS;
      },
      {
        onRejected: (err, times) => {
          logger.error(
            `sendTx getTransactionReceipt requestId:${request.id} airdropName:${this.cfg.airdropName} campaignId:${request.campaignId} error:${err}`
          );
          errorMsg = `${err}`;
        },
        onRejectedInterval: 10000,
        maxRetryTimes: retryTimes,
      }
    );
    return {
      status,
      errorMsg,
      receipt,
    };
  }
}
