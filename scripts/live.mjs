import {createAccount,createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {assertSuccessfulConsensus} from './receipt.mjs';
const root=new URL('../',import.meta.url);
const slug=fs.existsSync(new URL('contracts/tokenweave.py',root))?'tokenweave':'copack';
const file=new URL('evidence/live.json',root);
const journal=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{network:{chain_id:61999,rpc:'https://studio.genlayer.com/api'},started_at:new Date().toISOString(),transactions:[],records:[]};
if(journal.transactions.some(t=>!t.hash||!t.receipt||t.receipt.status!=='FINALIZED')||journal.error)throw Error('Inspect existing incomplete/failed journal; no automatic write retry.');
if(journal.completed_at)throw Error('Run already complete: use read.mjs.');
const account=createAccount(); // New un-funded test signer; no private key is read from the user or persisted.
const client=createClient({chain:studionet,account});
journal.run_owner=account.address;
function save(){fs.mkdirSync(new URL('evidence/',root),{recursive:true});fs.writeFileSync(file,JSON.stringify(journal,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');}
async function rpc(method,params=[]){const r=await fetch(journal.network.rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method,params})});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(j.error)throw Error(JSON.stringify(j.error));return j.result;}
const successful=assertSuccessfulConsensus;
async function finalized(label,send){
 if(journal.transactions.some(t=>t.label===label))throw Error('Existing intent: '+label);
 const entry={label,submitted_at:new Date().toISOString(),hash:null};journal.transactions.push(entry);save();
 try{entry.hash=await send();save();console.log(slug,label,'SUBMITTED',entry.hash);}catch(e){entry.error=String(e);save();throw Error(label+' submission uncertain: '+String(e));}
 for(let i=0;i<180;i++){
  const receipt=await rpc('eth_getTransactionByHash',[entry.hash]);entry.receipt=receipt;save();
  if(i%6===0)console.log(slug,label,receipt?.status);
  if(['UNDETERMINED','CANCELED','LEADER_TIMEOUT','VALIDATORS_TIMEOUT'].includes(receipt?.status))throw Error(label+' stopped: '+receipt.status);
  if(receipt?.status==='FINALIZED'){successful(receipt);console.log(slug,label,'VERIFIED',receipt.result);return receipt;}
  await new Promise(resolve=>setTimeout(resolve,5000));
 }
 throw Error(label+' pending; retain hash and inspect without resubmission');
}
try{
 if(BigInt(await rpc('eth_chainId'))!==61999n)throw Error('WRONG_CHAIN');
 if(BigInt(await rpc('eth_gasPrice'))!==0n)throw Error('NONZERO_GAS_PRICE: no paid transaction allowed');
 const code=fs.readFileSync(new URL('contracts/'+slug+'.py',root),'utf8');journal.source_sha256=crypto.createHash('sha256').update(code).digest('hex');save();
 let deployment=journal.transactions.find(t=>t.label==='deploy');
 if(!deployment){await finalized('deploy',()=>client.deployContract({code:new TextEncoder().encode(code),args:[],leaderOnly:false,consensusMaxRotations:0}));deployment=journal.transactions.find(t=>t.label==='deploy');}
 successful(deployment.receipt);const address=deployment.receipt.to_address;journal.contract_address=address;save();
 const deployed=await client.getContractCode(address);
 if(deployed!==code)throw Error('DEPLOYED_SOURCE_MISMATCH');journal.source_verified=true;save();
 const read=async(functionName,args=[])=>client.readContract({address,functionName,args,transactionHashVariant:'latest-final'});
 if(await read('get_protocol')!==slug+'-1')throw Error('PROTOCOL_MISMATCH');
 const basic=JSON.parse(fs.readFileSync(new URL('examples/basic.json',root),'utf8'));
 const cases=[];
 if(slug==='tokenweave'){
  cases.push(['reachable',basic,'REACHABLE']);
  cases.push(['unreachable',{...basic,initial:[0,0]},'UNREACHABLE']);
  cases.push(['review',{...basic,transitions:['Process the raw resource.']},'REVIEW']);
 }else{
  cases.push(['optimal',basic,'OPTIMAL']);
  const unknown={rules:'Only pairwise rules apply. No co-packing permission or prohibition is stated for any pair; no default permission is given.',items:['Object A.','Object B.'],sizes:[1,1],capacity:2};
  cases.push(['review',unknown,'REVIEW']);
  cases.push(['robust',{...unknown,sizes:[2,2]},'OPTIMAL']);
 }
 for(const [id,data,expected]of cases){
  fs.writeFileSync(new URL('examples/'+id+'.json',root),JSON.stringify(data,null,2)+'\n');
  await finalized(id+':seal',()=>client.writeContract({address,functionName:'seal',args:[id,JSON.stringify(data)],value:0n,leaderOnly:false,consensusMaxRotations:0}));
  const sealed=JSON.parse(await read('get_record',[account.address,id]));assert.equal(sealed.state,'SEALED');assert.deepEqual(sealed.input,data);assert.equal(sealed.owner,account.address.toLowerCase());
  await finalized(id+':analyze',()=>client.writeContract({address,functionName:'analyze',args:[id,0],value:0n,leaderOnly:false,consensusMaxRotations:0}));
  const raw=await read('get_record',[account.address,id]);const record=JSON.parse(raw);
  journal.records.push({id,owner:account.address,expected,record,readback_at:new Date().toISOString()});save();
  if(record.state!==expected||record.revision!==1||record.owner!==account.address.toLowerCase())throw Error('STATE_READBACK_MISMATCH '+id+' '+record.state);
  console.log(slug,id,'READBACK',record.state);
 }
 journal.completed_at=new Date().toISOString();save();console.log(slug,'COMPLETE',address);
}catch(e){journal.error=String(e);save();console.error(String(e));process.exitCode=1;}
