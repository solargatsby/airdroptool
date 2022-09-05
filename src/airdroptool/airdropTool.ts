import { AirdropToolJsonRpcServer } from "../rpc/server";
import { config } from "../common/config";
import { initLog, logger } from "../common/logger";
import { DefaultCore } from "../common/core";

const nconf = require("nconf");
const defaultConfigPath = "./config.json";

export class AirdropTool {
  private readonly configPath: string;
  private cfg: config;
  private jsonRpcServer: AirdropToolJsonRpcServer;

  constructor(cfgPath?: string) {
    this.jsonRpcServer = new AirdropToolJsonRpcServer();
    this.configPath =
      cfgPath || process.env.AIRDROP_TOOL_CONFIG || defaultConfigPath;
  }

  async init(): Promise<void> {
    this.cfg = await nconf.file(this.configPath).get("AirdropTool");
    if (!this.cfg) {
      console.error(`cannot found config from:${this.configPath}`);
      process.exit(1);
    }
    initLog(this.cfg.log!);

    await DefaultCore.init(this.cfg);
  }

  async start(): Promise<void> {
    await this.init();
    this.jsonRpcServer.start(this.cfg.rpcServer?.port!);
    logger.info(`AirdropTool rpc server start at:${this.cfg.rpcServer?.port}`);
  }
}
