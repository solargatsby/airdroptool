import { config } from "./config";
import { AirdropRequestDB } from "../db/airdropRequest";
import { AirdropResultDB } from "../db/airdropResult";
import { getConnection } from "../db/connection";
export class AirdropToolCore {
  cfg: config;
  airdropRequestDB: AirdropRequestDB;
  airdropResultDB: AirdropResultDB;

  constructor() {}

  async init(cfg: config): Promise<void> {
    this.cfg = cfg;
    const conn = await getConnection(this.cfg.orm!);
    this.airdropRequestDB = new AirdropRequestDB(conn);
    this.airdropResultDB = new AirdropResultDB(conn);
  }
}

export const DefaultCore = new AirdropToolCore();
