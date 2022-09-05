import { Connection, InsertResult, Repository, UpdateResult } from "typeorm";
import { AIRDROP_RESULT_INIT, AirdropResult } from "./entity/airdropResult";
import { IAirdropResult } from "./model/IAirdropResult";
import { pagingOptions, pagingResult } from "../common/common";

export class AirdropResultDB {
  private repository: Repository<AirdropResult>;

  constructor(private conn: Connection) {
    this.repository = conn.getRepository(AirdropResult);
  }

  async newAirdropResults(results: IAirdropResult[]): Promise<InsertResult> {
      const now = new Date()
    return await this.repository
      .createQueryBuilder()
      .insert()
      .values(results.map(result =>{
          return {
              requestId: result.requestId,
              receiver: result.receiver,
              status:result.status ?? AIRDROP_RESULT_INIT,
              txHash: result.txHash ?? "",
              errorMsg:result.errorMsg ?? "",
              createAt: now,
              updateAt: now,
          }
      }))
      .orUpdate({
        conflict_target: ["requestId", "receiver"],
        overwrite: ["updateAt"],
      })
      .execute();
  }

  async updateAirdropResult(result: IAirdropResult): Promise<UpdateResult> {
    return await this.repository
      .createQueryBuilder()
      .update()
      .set({
        status: result.status ?? AIRDROP_RESULT_INIT,
        txHash: result.txHash ?? "",
        errorMsg: result.errorMsg ?? "",
        updateAt: new Date(),
      })
      .where("requestId = :requestId and receiver = :receiver", {
        requestId: result.requestId,
        receiver: result.receiver,
      })
      .execute();
  }

  async getAirdropResultByReceiver(
    requestId: number,
    receiver: string
  ): Promise<AirdropResult | null> {
    return await this.repository
      .createQueryBuilder()
      .where("requestId = :requestId and receiver = :receiver", {
        requestId,
        receiver,
      })
      .getOne();
  }

  async getAirdropResults(
    requestId: number,
    options: {
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
      .orderBy("id", "DESC");
    if (options.status != undefined) {
      builder.andWhere("status in (:status)", { status: options.status.join(",") });
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
