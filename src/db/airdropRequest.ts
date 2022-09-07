import { Connection, Repository, UpdateResult } from "typeorm";
import { IAirdropRequest } from "./model/IAirdropRequest";
import {
  AIRDROP_REQUEST_INIT,
  AIRDROP_REQUEST_PENDING,
  AIRDROP_REQUEST_PROCESSING,
  AirdropRequest,
} from "./entity/airdropRequest";
import { pagingOptions, pagingResult } from "../common/common";

export class AirdropRequestDB {
  private repository: Repository<AirdropRequest>;

  constructor(private conn: Connection) {
    this.repository = conn.getRepository(AirdropRequest);
  }

  async newAirdropRequest(request: IAirdropRequest): Promise<number> {
    const res = await this.repository
      .createQueryBuilder()
      .insert()
      .values({
        campaignId: request.campaignId,
        airdropName: request.airdropName,
        category: request.category,
        chain: request.chain,
        status: request.status ?? AIRDROP_REQUEST_INIT,
        contractAddress: request.contractAddress,
        tokenURI: request.tokenURI,
        limit: request.limit,
        startTime: request.startTime,
        createAt: new Date(),
        updateAt: new Date(),
      })
      .execute();
    request.id = res.identifiers[0]["id"];
    return request.id!;
  }

  async updateAirdropRequest(request: IAirdropRequest): Promise<UpdateResult> {
    return await this.repository
      .createQueryBuilder()
      .update()
      .set({
        status: request.status!,
        limit: request.limit,
        updateAt: request.updateAt ?? new Date(),
      })
      .where("id = :requestId", { requestId: request.id! })
      .execute();
  }

  async getAirdropRequestByRequestId(
    requestId: number
  ): Promise<AirdropRequest | null> {
    return await this.repository
      .createQueryBuilder()
      .where("id = :id", { id: requestId })
      .getOne();
  }

  async getAirdropRequestByCampaignId(
    campaignId: number
  ): Promise<AirdropRequest | null> {
    return await this.repository
      .createQueryBuilder()
      .where("campaignId = :campaignId", { campaignId })
      .getOne();
  }

  async takeAirdropRequest(
    airdropName: string
  ): Promise<AirdropRequest | null> {
    return this.repository
      .createQueryBuilder()
      .where("airdropName = :airdropName", { airdropName })
      .andWhere(
        `status in (${AIRDROP_REQUEST_PENDING},${AIRDROP_REQUEST_PROCESSING})`
      )
      .orderBy("case when status = 2 then 1 else 0 end", "DESC")
      .orderBy("id", "ASC")
      .getOne();
  }

  async getAirdropRequests(options: {
    status?: number[];
    chain?: string;
    airdropName?: string;
    category?: string;
    page: pagingOptions;
  }): Promise<{
    data: AirdropRequest[];
    page: pagingResult;
  }> {
    const page = options.page;
    const builder = this.repository
      .createQueryBuilder()
      .limit(page.size)
      .offset(page.pageNo * page.size)
      .orderBy("id", "DESC");
    const where = new Array<string>();
    if (options.status != undefined) {
      where.push(`status in (${options.status.join(",")})`);
    }
    if (options.chain != undefined) {
      where.push("chain = :chain");
    }
    if (options.airdropName != undefined) {
      where.push("airdropName = :airdropName");
    }
    if (options.category != undefined) {
      where.push("category = :category");
    }
    if (where.length != 0) {
      builder.where(where.join(" and "));
      builder.setParameters({
        chain: options.chain,
        airdropName: options.airdropName,
        category: options.category,
      });
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
