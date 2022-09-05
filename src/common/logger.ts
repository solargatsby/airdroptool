import { logConfig } from "./config";
import { configure, getLogger } from "log4js";

export const logger = getLogger();

export const initLog = (cfg: logConfig): void => {
  const level = cfg.level || "INFO";
  const logCfg = {
    appenders: {
      out: {
        type: "stdout",
        layout: {
          type: "pattern",
          // ref: https://github.com/log4js-node/log4js-node/blob/master/docs/layouts.md
          pattern: `%[[%d %p %f{2}:%l]%] %m`,
        },
      },
    },
    categories: {
      default: { appenders: ["out"], level: level, enableCallStack: true },
    },
  };
  if (cfg.file !== undefined) {
    logCfg.appenders["app"] = {
      type: "file",
      filename: cfg.file,
      maxLogSize: 100 * 1024 * 1024, //100M
      backups: 10,
      layout: {
        type: "pattern",
        pattern: `[%d %p %f{2}:%l] %m`,
      },
    };
    logCfg.categories.default.appenders.push("app");
  }
  configure(logCfg);
};
