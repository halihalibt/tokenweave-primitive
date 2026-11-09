import {decodeInputData} from 'genlayer-js';
import {toRlp} from 'viem';
import assert from 'node:assert/strict';
export function assertIntent(entry,receipt,journal){
 assert.equal(receipt.hash,entry.hash,'transaction hash');
 assert.equal(BigInt(receipt.value),0n,'zero value');
 if(entry.label==='deploy')return;
 const [id,method]=entry.label.split(':');
 const record=journal.records.find(r=>r.id===id);
 if(!record)throw Error('Missing saved case '+id);
 assert.equal(receipt.from_address.toLowerCase(),record.owner.toLowerCase(),'sender');
 assert.equal(receipt.to_address.toLowerCase(),journal.contract_address.toLowerCase(),'recipient');
 const decoded=decodeInputData(toRlp(['0x'+Buffer.from(receipt.data.calldata,'base64').toString('hex'),'0x']));
 assert.equal(decoded.type,'call');
 const call=decoded.callData;
 assert.equal(call.get('method'),method,'method');
 const args=call.get('args');
 assert.equal(args[0],id,'record id');
 assert.equal(args.length,2,'argument count');
 if(method==='seal')assert.deepEqual(JSON.parse(args[1]),record.record.input,'sealed input');
 else {assert.equal(method,'analyze');assert.equal(args[1],0n,'expected revision');}
}
