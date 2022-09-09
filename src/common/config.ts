export const AIRDROP_CATEGORY_TASKON = "taskon";

export function getTaskonNftAidropConfigName(chain: string): string {
  return `taskon-nft-${chain.toLowerCase()}`;
}

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

export interface airdropConfig {
  airdropName: string; //airdrop name
  category: string;
  chain: string;
  rpc: string;
  privateKey?: string;
  keyStore?:string;
  keyStorePassword?:string;
  contractAddress: string;
  abiPath: string;
}

export interface config {
  orm?: ormConfig;
  log?: logConfig;
  rpcServer?: rpcServerConfig;
  airdrop?: airdropConfig[];
}
