import { AirdropToolResponse } from "../common";
import { ErrorCode } from "../error";

export async function paramsChecker(
  params: any
): Promise<AirdropToolResponse | undefined> {
  let err = addressCheck(params);
  if (err) {
    return err;
  }
  return;
}

function addressCheck(params: any): AirdropToolResponse | undefined {
  const address = params.address;
  if (address === undefined) {
    return;
  }
  if (typeof address !== "string" || address === "") {
    return AirdropToolResponse.fromError(
      ErrorCode.InvalidParams,
      "invalid address"
    );
  }
}
