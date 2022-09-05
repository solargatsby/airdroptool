export interface ormConfig {
  type: "mysql";
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
}

export interface rpcServerConfig {
  port: number;
}

export interface logConfig {
  file?: string;
  level?: string;
}

export interface chainConfig {
  cfgName: string; //config name
  chain: string;
  rpc: string;
  privateKey: string;
  contractAddress: string;
  abiPath:string;
}

export interface config {
  orm?: ormConfig;
  log?: logConfig;
  rpcServer?: rpcServerConfig;
  chain?: chainConfig[];
}
