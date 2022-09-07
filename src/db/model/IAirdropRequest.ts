export interface IAirdropRequest {
  id?: number;
  airdropName: string;
  category: string;
  campaignId: number;
  chain: string;
  status?: number;
  contractAddress: string;
  limit: number;
  tokenURI: string;
  startTime: Date;
  createAt?: Date;
  updateAt?: Date;
}
