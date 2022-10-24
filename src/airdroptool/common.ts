export const AIRDROP_REQUEST_TYPE_NEW = 0;
export const AIRDROP_REQUEST_TYPE_RETRY = 1;

export interface AirdropRequestNewParams {
  requestId: number;
  receivers: string[];
  limit: number;
}

export interface AirdropRequestRetryParams {
  requestId: number;
  receivers?: string[];
}

export interface AirdropRequestQueueItem {
  type: number;
  params: AirdropRequestNewParams | AirdropRequestRetryParams;
}
