export interface IAirdropResult {
  requestId: number;
  receiver: string;
  status?: number;
  txHash?: string;
  errorMsg?: string;
}
