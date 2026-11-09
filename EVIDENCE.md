# Verified Stable Studionet records

Contract: [`0x76E9871ef2FBfF1d6f866418562Fe592376c14bF`](https://explorer-studio.genlayer.com/address/0x76E9871ef2FBfF1d6f866418562Fe592376c14bF)

- Network: Stable Studionet, chain 61999, RPC `https://studio.genlayer.com/api`.
- Exact deployed source SHA256: `323858951899a9fd64ceb799dff8a4b1e820966719fe499fb98788293e2ba66e`.
- Source bytes were read from the deployed contract and matched the canonical file exactly.
- All seven listed transactions are FINALIZED, successful, Normal / Full Consensus, with MAJORITY_AGREE. Idle voters are retained; majority agreement is not unanimity.
- No appeal, configured rotation or automatic transaction resubmission was used. Transaction value and gas price were zero. No user wallet or user private key was used.

## Real transactions

| Operation | Transaction | Finality | Leader execution | Votes |
| --- | --- | --- | --- | --- |
| deploy | [0xcd8da1bf25…](https://explorer-studio.genlayer.com/tx/0xcd8da1bf255be1c21808281f9240ff3a91e9968ec4c9f31279a48c015be02c7b) | FINALIZED | SUCCESS | 3/5 AGREE |
| reachable:seal | [0x048c972d30…](https://explorer-studio.genlayer.com/tx/0x048c972d3075c0f222da4bf3d856d96170478fe4c1008015670c3272afc25c98) | FINALIZED | SUCCESS | 3/5 AGREE |
| reachable:analyze | [0x2b0f6800a2…](https://explorer-studio.genlayer.com/tx/0x2b0f6800a2cab86121ce301751e120fc3c51cd7378f0daed8e84f330561582aa) | FINALIZED | SUCCESS | 3/5 AGREE |
| unreachable:seal | [0x5b0e0331ba…](https://explorer-studio.genlayer.com/tx/0x5b0e0331ba6f8a9e23ff1f2bce4dce36a431255248c5c94486af9d04309439d5) | FINALIZED | SUCCESS | 5/5 AGREE |
| unreachable:analyze | [0x0cb5b24cc2…](https://explorer-studio.genlayer.com/tx/0x0cb5b24cc2951966cf19745ab81cff023fcbc6d1dbff1dd0aa62ba7ac3175128) | FINALIZED | SUCCESS | 3/5 AGREE |
| review:seal | [0xd17eddcdae…](https://explorer-studio.genlayer.com/tx/0xd17eddcdae7d6706bd7e75ac948cda35da552562fe4fd1f3c798fe1c208debd5) | FINALIZED | SUCCESS | 3/5 AGREE |
| review:analyze | [0xdd4e08beb8…](https://explorer-studio.genlayer.com/tx/0xdd4e08beb8b6c87571203ff7560c29a9a160232268b226f110fe472e7b6f507a) | FINALIZED | SUCCESS | 3/5 AGREE |

## Finalized state readback

| Record ID | Record owner | Accepted business state |
| --- | --- | --- |
| reachable | `0xf5f8C08fB08fC5C55013Ed6EB1216Aa146EAee22` | REACHABLE |
| unreachable | `0xf5f8C08fB08fC5C55013Ed6EB1216Aa146EAee22` | UNREACHABLE |
| review | `0xf5f8C08fB08fC5C55013Ed6EB1216Aa146EAee22` | REVIEW |

The REACHABLE example has shortest trace `[0]`; the UNREACHABLE example has no raw token, so no transition can start. The incomplete process statement is accepted as REVIEW, with no reachability claim.

`npm run read` makes only reads: it validates chain identity, current receipts, majority evidence, successful leader execution, exact transaction intent, deployed source, finalized records, and input/result hashes. `python scripts/verify_proof.py` independently checks all captured mathematical certificates, without calling the model or network.

## Evidence formats

`evidence/live.json` contains inputs, accepted interpretations, finalized readbacks and explicitly selected original receipt fields. `evidence/raw-live.json.gz` preserves the complete unmodified original journal, including raw RPC receipts and node diagnostics. Archive SHA256: `d4e28fe8994b78a9d1d4e5475f562e0c35b247353d485b1b1f54563828526bdc`. Decompress with `gzip -dc evidence/raw-live.json.gz`.

`evidence/schema.json` is the real Stable Studio schema compilation response. Compilation alone is not proof of live consensus.

## Local simulation scope

12 Python unit tests passed. Their model and SDK are explicit substitutes. They include a separate exhaustive mathematical oracle and material validator-disagreement cases. The receipt-gate test accepts the recorded success shape and rejects nine false-success conditions (including finality without agreement, missing votes, unsuccessful execution and leader-only mode). These tests are not live consensus evidence.

## Limits of this run

Three small synthetic business cases were executed. This is not a general language benchmark or a proof of provider independence. Test signer secrets were held only in process memory and discarded; the public records remain readable, but the same test identities cannot author new records after process exit.
