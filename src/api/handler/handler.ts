import { AirdropToolResponse, IAirdropToolHandlerRegister } from "../common";
import { AirdropToolHandlerRegister } from "../handlerRegister";
import { getDefaultMiddlewareRegister } from "../middlewares/middlewares";
import { GlobalAirdropTool } from "../../airdroptool/airdropTool";
import { pagingOptions } from "../../common/common";
import { ErrorCode } from "../error";
import {
  normalizePageOptions,
  notUndefinedAll,
  notUndefinedOne,
} from "../../utils/utils";

export function getDefaultHandlerRegister(): IAirdropToolHandlerRegister {
  const defaultRegister = new AirdropToolHandlerRegister(
    getDefaultMiddlewareRegister()
  );
  defaultRegister.register("newAirdrop", newAirdrop);
  defaultRegister.register("retryAirdrop", retryAirdrop);
  defaultRegister.register("cancelAirdrop", cancelAirdrop);
  defaultRegister.register("getAirdropRequest", getAirdropRequest);
  defaultRegister.register("getAirdropRequestList", getAirdropRequestList);
  defaultRegister.register("getAirdropResult", getAirdropResult);
  return defaultRegister;
}

export async function newAirdrop(params: {
  campaignId: number;
  chain: string;
  tokenURI: string;
  receivers: string[];
}): Promise<AirdropToolResponse> {
  if (
    !notUndefinedAll(
      params.campaignId,
      params.chain,
      params.tokenURI,
      params.receivers
    )
  ) {
    return AirdropToolResponse.fromError(
      ErrorCode.InvalidParams,
      "campaignId, chain, tokenURI, receivers required"
    );
  }

  const { requestId, error } =
    await GlobalAirdropTool.newTaskonNftAirdropRequest(
      params.chain,
      params.campaignId,
      params.tokenURI,
      params.receivers
    );
  if (error !== undefined) {
    return AirdropToolResponse.fromError(
      ErrorCode.InvalidParams,
      error.message
    );
  }
  return AirdropToolResponse.fromData({
    requestId,
  });
}

export async function retryAirdrop(params: {
  requestId?: number;
  campaignId?: number;
  receivers?: string[];
}): Promise<AirdropToolResponse> {
  if (!notUndefinedOne(params.campaignId, params.requestId)) {
    return AirdropToolResponse.fromError(
      ErrorCode.InvalidParams,
      "requestId or campaignId required"
    );
  }

  let requestId = params.requestId;
  if (requestId === undefined) {
    const request = await GlobalAirdropTool.getAirdropRequest({
      campaignId: params.campaignId!,
    });
    if (!request) {
      return AirdropToolResponse.fromError(
        ErrorCode.InvalidParams,
        "invalid campaignId"
      );
    }
    requestId = request.id;
  }

  await GlobalAirdropTool.retryTaskonNftAirdropRequest(
    requestId,
    params.receivers
  );
  return AirdropToolResponse.fromData("success");
}

export async function cancelAirdrop(params: {
  requestId?: number;
  campaignId?: number;
}): Promise<AirdropToolResponse> {
  if (!notUndefinedOne(params.campaignId, params.requestId)) {
    return AirdropToolResponse.fromError(
      ErrorCode.InvalidParams,
      "requestId or campaignId required"
    );
  }

  let requestId = params.requestId;
  if (requestId === undefined) {
    const request = await GlobalAirdropTool.getAirdropRequest({
      campaignId: params.campaignId!,
    });
    if (!request) {
      return AirdropToolResponse.fromError(
        ErrorCode.InvalidParams,
        "invalid campaignId"
      );
    }
    requestId = request.id;
  }
  const error = await GlobalAirdropTool.cancelTaskonNftAirdropRequest(
    requestId
  );
  if (error !== undefined) {
    return AirdropToolResponse.fromError(
      ErrorCode.InvalidParams,
      error?.message
    );
  }
  return AirdropToolResponse.fromData(true);
}

export async function getAirdropRequest(params: {
  requestId?: number;
  campaignId?: number;
}): Promise<AirdropToolResponse> {
  if (!notUndefinedOne(params.campaignId, params.requestId)) {
    return AirdropToolResponse.fromError(
      ErrorCode.InvalidParams,
      "requestId or campaignId required"
    );
  }
  return AirdropToolResponse.fromData(
    await GlobalAirdropTool.getAirdropRequest(params)
  );
}

export async function getAirdropRequestList(params: {
  airdropName?: string;
  category?: string;
  status?: number[];
  page?: pagingOptions;
}): Promise<AirdropToolResponse> {
  const requests = await GlobalAirdropTool.getAirdropRequestList({
    airdropName: params.airdropName,
    category: params.category,
    status: params.status,
    page: normalizePageOptions(params.page),
  });
  return AirdropToolResponse.fromData(requests);
}

export async function getAirdropResult(params: {
  requestId?: number;
  campaignId?: number;
  status?: number[];
  receivers?: string[];
  page?: pagingOptions;
}): Promise<AirdropToolResponse> {
  if (!notUndefinedOne(params.campaignId, params.requestId)) {
    return AirdropToolResponse.fromError(
      ErrorCode.InvalidParams,
      "requestId or campaignId required"
    );
  }

  let requestId = params.requestId;
  if (requestId === undefined) {
    const request = await GlobalAirdropTool.getAirdropRequest({
      campaignId: params.campaignId!,
    });
    if (!request) {
      return AirdropToolResponse.fromError(
        ErrorCode.InvalidParams,
        "invalid campaignId"
      );
    }
    requestId = request.id;
  }

  const results = await GlobalAirdropTool.getAirdropResult(requestId!, {
    status: params.status,
    receivers: params.receivers,
    page: normalizePageOptions(params.page),
  });
  return AirdropToolResponse.fromData(results);
}
