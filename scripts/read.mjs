import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {assertSuccessfulConsensus} from './receipt.mjs';
import {assertIntent} from './intent.mjs';
const root=new URL('../',import.meta.url);
const slug=fs.existsSync(new URL('contracts/tokenweave.py',root))?'tokenweave':'copack';
const journal=JSON.parse(fs.readFileSync(new URL('evidence/live.json',root),'utf8'));
const client=createClient({chain:studionet});
const canon=x=>JSON.stringify(x===null||typeof x!=='object'?x:Array.isArray(x)?x.map(y=>JSON.parse(canon(y))):Object.fromEntries(Object.keys(x).sort().map(k=>[k,JSON.parse(canon(x[k]))])));
const hash=x=>crypto.createHash('sha256').update(canon(x)).digest('hex');
if(BigInt(await client.request({method:'eth_chainId',params:[]}))!==61999n)throw Error('WRONG_CHAIN');
for(const entry of journal.transactions){
 if(!entry.hash)throw Error('Missing transaction hash');
 const receipt=await client.request({method:'eth_getTransactionByHash',params:[entry.hash]});
 const votes=assertSuccessfulConsensus(receipt);
 assertIntent(entry,receipt,journal);
 console.log(entry.label,entry.hash,receipt.status,votes.agree+'/'+votes.total+' AGREE');
}
const address=journal.contract_address??journal.transactions.find(t=>t.label==='deploy').receipt.to_address;
const source=fs.readFileSync(new URL('contracts/'+slug+'.py',root),'utf8');
if(await client.getContractCode(address)!==source)throw Error('SOURCE_MISMATCH');
for(const entry of journal.records){
 const result=JSON.parse(await client.readContract({address,functionName:'get_record',args:[entry.owner,entry.id],transactionHashVariant:'latest-final'}));
 if(canon(result)!==canon(entry.record))throw Error('READBACK_MISMATCH');
 if(result.input_hash!==hash({protocol:slug+'-1',input:result.input}))throw Error('INPUT_HASH_MISMATCH');
 if(result.result_hash!==hash({protocol:slug+'-1',owner:result.owner,record_id:result.record_id,input_hash:result.input_hash,accepted:result.accepted,proof:result.proof}))throw Error('RESULT_HASH_MISMATCH');
 if(result.state!==entry.expected||result.revision!==1)throw Error('EXPECTED_RESULT_MISMATCH');
 console.log(entry.id,result.state,'finalized state and hashes match');
}
console.log('SOURCE VERIFIED',address);
