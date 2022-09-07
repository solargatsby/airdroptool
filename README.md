# AirdropTool

#  How to start?
- rename config.example.json to config.json and set config.json correctly;
- using ```yarn install``` to install dependencies;
- using ```yarn start``` to start airdrop tool;

# API docs

URL ```POST http://localhost:8060/airdroptool/api/v1```

1、newAirdrop

create new airdrop task

params

| name | option or required | type | description                               | 
| ----- | ----------------- | ---- |-------------------------------------------|
 | campaignId | required | number | campaign id must be unique                |
 | chain | required | string | evm chain, only support polygon currently |
 | tokenURI | required | string | tokenURI of nft                           |
 | receivers | required | string[]| nft recevier                              |

example:

```json
{
    "jsonrpc": "2.0", 
    "method": "newAirdrop", 
    "params": {
        "campaignId":351,
        "chain":"polygon",
        "tokenURI":"testuri",
        "receivers":["0xEc929115b0a4A687BAaa81CA760cbF15380F7D0C"]
        },
    "id": 1
}
```

2、getAirdropRequest

query airdrop task by requestId or campaignId

params

| name       | option or required | type | description               | 
|------------| ----------------- | ---- |---------------------------|
| requestId  | option | number |   |
| campaignId | option | number |    |

example:

```json
{
    "jsonrpc": "2.0",
    "method": "getAirdropRequest",
    "params": {
        "requestId": 6
    },
    "id": 1
}
```

3、getAirdropRequestList 

query airdrop task list

params

| name        | option or required | type     | description                                                        | 
|-------------| ----------------- |----------|--------------------------------------------------------------------|
| airdropName | option | string   | eg: taskon-nft-polygon                                             |
| category    | option | string   | eg: taskon                                                         |
| status      | option | number[] | INIT = 0, PENDING = 1, PROCESSING = 2, COMPLETED = 3, CANCELED = 4 |
| page    | option | object   | using pageNo and size to paging, max page size is 1000             |

example

```json
{
  "jsonrpc": "2.0",
  "method": "getAirdropRequestList",
  "params": {
   "airdropName": "taskon-nft-polygon",
   "page": {
    "pageNo": 0,
    "size": 30
   }
  },
  "id": 1
}
```

4、getAirdropResult

query airdrop result

params

| name       | option or required | type     | description                                                    | 
|------------| ----------------- |----------|----------------------------------------------------------------|
| requestId  | option | number   | id or airdrop task                                             |
| campaignId | option | number   | campaign id of airdrop                                         |
| status     | option | number[] | INIT = 0, PENDING = 1, PROCESSING = 2, SUCCESS = 3, FAILED = 4 |
| receivers  | option | string[] | receivers of nft                                               |
| page       | option | object   | using pageNo and size to paging, max page size is 1000         |

example

```json
{
    "jsonrpc": "2.0",
    "method": "getAirdropResult",
    "params": {
        "requestId": 6,
        "page": {
            "pageNo": 0,
            "size": 30
        }
    },
    "id": 1
}
```

5、 cancelAirdrop

cancel uncomplete airdrop

params

| name       | option or required | type     | description                                                    | 
|------------| ----------------- |----------|--------------------------------|
| requestId  | option | number   | id or airdrop task                                             |
| campaignId | option | number   | campaign id of airdrop                                         |

example

```json
{
    "jsonrpc": "2.0",
    "method": "cancelAirdrop",
    "params": {
        "requestId": 7
    },
    "id": 1
}
```