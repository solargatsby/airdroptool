import { AirdropTool } from "./airdroptool/airdropTool";

async function main(): Promise<void> {
  const airdropTool = new AirdropTool();
  await airdropTool.start();
}
void main();
