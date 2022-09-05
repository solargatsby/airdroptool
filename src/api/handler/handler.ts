import {
  AirdropToolHandler,
  AirdropToolResponse,
  IAirdropToolHandlerRegister,
} from "../common";
import { AirdropToolHandlerRegister } from "../handlerRegister";
import { getDefaultMiddlewareRegister } from "../middlewares/middlewares";
import {DefaultCore} from "../../common/core";

export function getDefaultHandlerRegister(): IAirdropToolHandlerRegister {
  const defaultRegister = new AirdropToolHandlerRegister(
    getDefaultMiddlewareRegister()
  );
  defaultRegister.register("newAirdrop", newAirdrop);
  return defaultRegister;
}

export async function newAirdrop(params: {
  campaignId: number;
  receivers: string[];
}): Promise<AirdropToolResponse> {
  const requestId = await DefaultCore.airdropRequestDB.newAirdropRequest({
    campaignId:params.campaignId,
    chain: 'polygon',
    contractAddress: 'address',
    startTime: new Date(),
  })
  await DefaultCore.airdropResultDB.newAirdropResults(params.receivers.map((value)=>{
    return {
      requestId,
      receiver: value
    }
  }))
  return AirdropToolResponse.fromData({
    requestId
  });
}
