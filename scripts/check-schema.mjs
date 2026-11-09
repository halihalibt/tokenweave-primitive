import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import fs from 'node:fs';
const c=createClient({chain:studionet});
const root=new URL('../',import.meta.url);
const code=fs.readFileSync(new URL('contracts/tokenweave.py',root),'utf8');
const schema=await c.getContractSchemaForCode(code);
console.log(JSON.stringify(schema,null,2));
