import { Connection, InsertResult, Repository, UpdateResult } from "typeorm";
import {
  AIRDROP_RESULT_FAILED,
  AIRDROP_RESULT_INIT,
  AirdropResult,
} from "./entity/airdropResult";
import { IAirdropResult } from "./model/IAirdropResult";
import { pagingOptions, pagingResult } from "../common/common";

export class AirdropResultDB {
  private repository: Repository<AirdropResult>;

  constructor(private conn: Connection) {
    this.repository = conn.getRepository(AirdropResult);
  }

  async newAirdropResults(results: IAirdropResult[]): Promise<InsertResult> {
    const now = new Date();
    return await this.repository
      .createQueryBuilder()
      .insert()
      .values(
        results.map((result) => {
          return {
            requestId: result.requestId,
            receiver: result.receiver,
            status: result.status ?? AIRDROP_RESULT_INIT,
            txHash: result.txHash ?? "",
            errorMsg: result.errorMsg ?? "",
            createAt: now,
            updateAt: now,
          };
        })
      )
      .orUpdate({
        conflict_target: ["requestId", "receiver"],
        overwrite: ["updateAt"],
      })
      .execute();
  }

  async updateAirdropResults(
    requestId: number,
    status: number,
    txHash: string,
    errorMsg: string,
    receivers: string[]
  ): Promise<UpdateResult> {
    return await this.repository
      .createQueryBuilder()
      .update()
      .set({
        status: status,
        txHash: txHash,
        errorMsg: errorMsg,
        updateAt: new Date(),
      })
      .where(
        `requestId = ${requestId} and receiver in (${receivers
          .map((receiver) => {
            return `'${receiver}'`;
          })
          .join(",")})`
      )
      .execute();
  }

  async resetFailedAirdropResults(options: {
    requestId: number;
    receivers?: string[];
  }): Promise<UpdateResult> {
    const now = new Date();
    const builder = this.repository
      .createQueryBuilder()
      .where("requestId = :requestId and status = :status", {
        requestId: options.requestId,
        status: AIRDROP_RESULT_FAILED,
      })
      .update()
      .set({
        status: AIRDROP_RESULT_INIT,
        txHash: "",
        errorMsg: "",
        updateAt: now,
      });
    if (options.receivers !== undefined && options.receivers.length === 0) {
      builder.andWhere(
        `receiver in (${options.receivers
          .map((receiver) => {
            return `'${receiver}'`;
          })
          .join(",")})`
      );
    }
    return await builder.execute();
  }

  async getCountOfAirdropResult(requestId: number): Promise<number> {
    return await this.repository
      .createQueryBuilder()
      .where("requestId = :requestId", { requestId })
      .getCount();
  }

  async getAirdropResults(
    requestId: number,
    options: {
      receivers?: string[];
      status?: number[];
      page: pagingOptions;
    }
  ): Promise<{
    data: AirdropResult[];
    page: pagingResult;
  }> {
    const page = options.page;
    const builder = this.repository
      .createQueryBuilder()
      .where("requestId = :requestId", { requestId })
      .limit(page.size)
      .offset(page.pageNo * page.size)
      .orderBy("id", "ASC");
    if (options.status != undefined) {
      builder.andWhere(`status in (${options.status.join(",")})`);
    }
    if (options.receivers != undefined && options.receivers.length !== 0) {
      builder.andWhere(
        `receiver in (${options.receivers
          .map((receiver) => {
            return `'${receiver}'`;
          })
          .join(",")})`
      );
    }
    const [data, total] = await builder.getManyAndCount();
    return {
      data,
      page: {
        ...page,
        total,
      },
    };
  }
}
