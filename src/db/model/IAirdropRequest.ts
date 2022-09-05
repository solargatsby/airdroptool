export interface IAirdropRequest {
  requestId?: number;
  campaignId: number;
  chain: string;
  status?: number;
  contractAddress: string;
  startTime: Date;
  createAt?: Date;
  updateAt?: Date;
}
