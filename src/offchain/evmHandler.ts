import { ethers, ContractTransaction, BigNumber } from "ethers";
import { readFileSync } from "fs";
import { foreverPromise, retryPromise } from "../utils/promise";
import { logger } from "../common/logger";
import { DefaultCore } from "../common/core";
import {
  AIRDROP_REQUEST_CANCELED,
  AIRDROP_REQUEST_COMPLETED,
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
import * as fs from "fs";

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
    this.iface = new ethers.utils.Interface(
      readFileSync(cfg.abiPath).toString("utf8")
    );
    if (this.cfg.keyStore) {
      const ks = fs.readFileSync(this.cfg.keyStore).toString("utf-8");
      this.wallet = ethers.Wallet.fromEncryptedJsonSync(
        ks,
        this.cfg.keyStorePassword!
      ).connect(this.provider);
    } else {
      this.wallet = new ethers.Wallet(this.cfg.privateKey!).connect(
        this.provider
      );
    }
    this.contract = new ethers.Contract(
      this.cfg.contractAddress,
      this.iface,
      this.wallet
    );

    // const params = "0x0a2044e3388085012a05f20085037e11d60083086d4f947cf3d2fe1bb390566c0f8b491ec04837aeb8753680b901640a2044e3000000000000000000000000000000000000000000000000000000000000045e00000000000000000000000000000000000000000000000000000000000003e8000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000ec929115b0a4a687baaa81ca760cbf15380f7d0c000000000000000000000000c3ef3a3cd0c1364c0fa9d59ae220533eb6dc445a0000000000000000000000004723dc895a743ceb6a57af7503ca2b01974824810000000000000000000000000000000000000000000000000000000000000035697066733a2f2f516d586f5a374d57466771744231316d793462435547774c6e74384c46713334564b34534c324d484157467538520000000000000000000000c001a0ea037f1d04668293618abbe6ff4c131d901e5825256a7664baef948a5d1b521aa06400ca62ad820e600331e23aafc8d62aa45511ac29ed4ce5057d019841ad5a75"
    // console.log("====:")
    // const tx =  this.iface.parseTransaction({data:params})
    // console.log(tx)
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
    const pageSize = 30; //bath size for a tx
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
      "",
      receivers
    );

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
    const gasPrice = await this.provider.getGasPrice();
    if (this.chain === "bsc"){
      return {
        gasPrice,
        maxFeePerGas:null,
        maxPriorityFeePerGas:null
      }
    }

    const maxFeePerGas = gasPrice.mul(3);
    const maxPriorityFeePerGas = gasPrice;
    return {
      gasPrice: null,
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
