import { AirdropToolMiddlewareAction, AirdropToolResponse } from "./common";

export class AirdropToolRegister {
  private readonly actions: AirdropToolMiddlewareAction[];

  constructor() {
    this.actions = [];
  }

  register(action: AirdropToolMiddlewareAction) {
    this.actions.push(action);
  }

  async process(params: any): Promise<AirdropToolResponse | undefined> {
    for (const action of this.actions) {
      const res = await action(params);
      if (res) {
        return res;
      }
    }
    return undefined;
  }
}
