import { ormConfig } from "../common/config";
import { Connection, createConnection } from "typeorm";

export async function getConnection(cfg: ormConfig): Promise<Connection> {
  return createConnection({
    type: cfg.type,
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
    password: cfg.password,
    database: cfg.database,
    synchronize: cfg.synchronize,
    logging: cfg.logging,
    charset: "utf8mb4",
    entities: [__dirname + "/entity/*.ts"],
  });
}
