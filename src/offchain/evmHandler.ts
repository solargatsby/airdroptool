import {chainConfig} from "../common/config";
import {ethers} from "ethers";
import {readFileSync} from "fs";
import {foreverPromise} from "../utils/promise";
import {logger} from "../common/logger";
import {DefaultCore} from "../common/core";
import {
    AIRDROP_REQUEST_INIT,
    AIRDROP_REQUEST_PENDING,
    AIRDROP_REQUEST_PROCESSING,
    AirdropRequest
} from "../db/entity/airdropRequest";
import {AIRDROP_RESULT_PENDING, AIRDROP_RESULT_PROCESSING} from "../db/entity/airdropResult";

export class EvmHandler {
    public handlerName: string
    public chain: string
    public provider: ethers.providers.JsonRpcProvider
    public contract: ethers.Contract

    constructor(public cfg: chainConfig) {
        this.handlerName = cfg.cfgName
        this.chain = cfg.chain.toLowerCase()
        this.provider = new ethers.providers.JsonRpcProvider(cfg.rpc);
        const wallet = new ethers.Wallet(cfg.privateKey).connect(this.provider);
        const abi = readFileSync(cfg.abiPath).toString('utf8')
        this.contract = new ethers.Contract(cfg.contractAddress, abi, wallet)
    }

    async airdrop(request: AirdropRequest):Promise<string>{
        logger.info(`EvmHandler start to airdrop requestId:${request.id} campaignId:${request.campaignId} chain:${request.chain} contractAddress:${request.contractAddress}`)

        let pageNo = 0
        let pageSize = 100
        let airdropResults = await DefaultCore.airdropResultDB.getAirdropResults(request.id,{
            status:[AIRDROP_REQUEST_INIT, AIRDROP_RESULT_PENDING, AIRDROP_RESULT_PROCESSING],
            page:{
                pageNo,
                size:pageSize,
            }
        })

        logger.info(`EvmHandler requestId:${request.id} total:${airdropResults.page.total}`)
        for (const result of airdropResults.data){

        }
        return ""
    }

    loadAirdropRequest():void{
        foreverPromise(async (times)=>{
            const request = await DefaultCore.airdropRequestDB.takeAirdropRequest(this.chain)
            if (request == undefined){
                return
            }
            await this.airdrop(request)
        },{
            onRejectedInterval: 5000,
            onResolvedInterval: 5000,
            onRejected:function (err) {
                logger.error(`loadAirdropRequest error:${err}`)
            }
        })
    }

}