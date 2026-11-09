import assert from 'node:assert/strict';
import {assertSuccessfulConsensus} from '../scripts/receipt.mjs';
const good={status:'FINALIZED',leader_only:false,execution_mode:'NORMAL',appealed:false,result:6,consensus_data:{votes:{a:'agree',b:'agree',c:'agree',d:'idle',e:'idle'},leader_receipt:[{mode:'leader',execution_result:'SUCCESS'}]}};
assert.equal(assertSuccessfulConsensus(good).agree,3);
for(const patch of [{status:'ACCEPTED'},{result:7},{result:0},{leader_only:true},{execution_mode:'LEADER_ONLY'},{appealed:true},{consensus_data:{}},{consensus_data:{votes:{a:'agree',b:'disagree',c:'disagree'},leader_receipt:[{mode:'leader',execution_result:'SUCCESS'}]}},{consensus_data:{...good.consensus_data,leader_receipt:[{mode:'leader',execution_result:'ERROR'}]}}])assert.throws(()=>assertSuccessfulConsensus({...good,...patch}));
console.log('Receipt gate: majority success accepted; 9 false-success conditions rejected.');
