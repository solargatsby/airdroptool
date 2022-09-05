import {Connection, Repository, UpdateResult} from "typeorm";
import { IAirdropRequest } from "./model/IAirdropRequest";
import {
  AIRDROP_REQUEST_INIT,
  AIRDROP_REQUEST_PENDING,
  AIRDROP_REQUEST_PROCESSING,
  AirdropRequest
} from "./entity/airdropRequest";
import { AirdropResult } from "./entity/airdropResult";
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
        chain: request.chain,
        status: request.status ?? AIRDROP_REQUEST_INIT,
        contractAddress:request.contractAddress,
        startTime: request.startTime,
        createAt:new Date(),
        updateAt: new Date(),
      })
      .execute();
    request.requestId = res.identifiers[0]['id'];
    return request.requestId!;
  }

  async updateAirdropRequest(request: IAirdropRequest) :Promise<UpdateResult>{
    return await this.repository
        .createQueryBuilder()
        .update()
        .set({
            status:request.status!,
            updateAt:new Date(),
        })
        .where("id = :requestId", {requestId:request.requestId!})
        .execute()
  }

  async getAirdropRequestByRequestId(
    requestId: number
  ): Promise<AirdropRequest | null> {
    return await this.repository
      .createQueryBuilder()
      .where("id = :id", { id: requestId })
      .getOne();
  }

  async getAirdropRequestsByCampaignId(
      campaignId: number
  ): Promise<AirdropRequest | null> {
    return await this.repository
        .createQueryBuilder()
        .where("campaignId = :campaignId", { campaignId })
        .getOne();
  }

  async takeAirdropRequest(chain:string):Promise<AirdropRequest|null>{
    return this.repository
        .createQueryBuilder()
        .where("chain := chain", {chain})
        .andWhere("status in (:status)", {status: [AIRDROP_REQUEST_INIT,AIRDROP_REQUEST_PENDING,AIRDROP_REQUEST_PROCESSING].join(",")})
        .orderBy('case when status = 2 then 1 else 0 end', "DESC")
        .orderBy('id', "ASC")
        .getOne()
  }

  async getAirdropRequests(options: {
    status?: number[];
    chain?:string;
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
    const where = new Array<string>()
    if (options.status != undefined) {
      where.push("status in (:status)")
    }
    if(options.chain != undefined){
      where.push("chain = :chain")
    }
    if(where.length != 0){
      builder.where(where.join(" and "))
      builder.setParameters({
        status:  options.status?.join(","),
        chain: options.chain,
      })
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
