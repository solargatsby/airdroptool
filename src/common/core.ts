import { chainConfig, config } from "./config";
import { AirdropRequestDB } from "../db/airdropRequest";
import { AirdropResultDB } from "../db/airdropResult";
import { getConnection } from "../db/connection";
import { logger } from "../common/logger";
export class AirdropToolCore {
  cfg: config;
  airdropRequestDB: AirdropRequestDB;
  airdropResultDB: AirdropResultDB;
  chanCfg: Map<string, chainConfig>;

  constructor() {
    this.chanCfg = new Map<string, chainConfig>();
  }

  async init(cfg: config): Promise<void> {
    this.cfg = cfg;
    for (const chain of cfg.chain!) {
      if (this.chanCfg.get(chain.cfgName) != undefined) {
        logger.error(
          `duplicate chan config:${chain.cfgName} chain:${chain.chain} contractAddress:${chain.contractAddress}`
        );
        process.exit(1);
      }
    }
    const conn = await getConnection(this.cfg.orm!);
    this.airdropRequestDB = new AirdropRequestDB(conn);
    this.airdropResultDB = new AirdropResultDB(conn);
  }
}

export const DefaultCore = new AirdropToolCore();
