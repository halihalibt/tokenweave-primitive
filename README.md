# TokenWeave

A bounded token-flow compiler and exhaustive reachability primitive. Written action descriptions become independently agreed consume, produce and read vectors. Deterministic breadth-first search returns a shortest target trace, all reachable markings and reachable deadlocks.

**Deployed:** [`0x76E9871ef2FBfF1d6f866418562Fe592376c14bF`](https://explorer-studio.genlayer.com/address/0x76E9871ef2FBfF1d6f866418562Fe592376c14bF) · [Seven finalized transactions](EVIDENCE.md) · [Deployment manifest](deployment.json)

## Run the local checks

```sh
npm ci
npm test
npm run read
python scripts/verify_proof.py
```

Python 3.12+ and Node.js 22+ are supported. Local unit tests use an explicit SDK/model substitute, including validator disagreement. They do not establish network consensus. Studio schema compilation is a separate network compatibility check.

## Use the contract

Deploy the complete `contracts/tokenweave.py` file with **no constructor arguments** on **Stable Studionet 61999**, RPC `https://studio.genlayer.com/api`. Use Normal / Full Consensus; `leaderOnly` must be false. No funds, tokens, transfers or external paid API keys are needed.

1. Call `seal("example-1", payload)` with the exact JSON in `examples/basic.json` as a string. This fixes the input in the sender's namespace.
2. Call `analyze("example-1", 0)` from that same sender. Independent semantic agreement and deterministic proof computation happen atomically.
3. Read `get_record(owner_address, "example-1")` from finalized state. Inspect `accepted`, `proof`, `result_hash` and `state`.

Use a different record ID for corrected input. Exact duplicate sealing is idempotent; different input under an existing ID is rejected. Analysis is terminal once accepted, including REVIEW. An infrastructure/model failure or rejected consensus must not be reported as an accepted REVIEW.

## Consensus boundary

The leader and each validator receive the original immutable input and the same protocol rules. Every validator invokes the model independently and compares the full normalized semantic result with the candidate. Any changed decision field rejects the candidate, even when the aggregate result would remain unchanged. Schema checks happen in addition to independent interpretation. The model never chooses the final mathematical result.

`npm run read` rechecks existing receipts, deployed source, finalized records and hashes without sending a transaction. `python scripts/verify_proof.py` independently checks the captured mathematical certificates offline.

A successful transaction is not established by finality alone: verify FINALIZED, successful execution, agreement evidence and exact saved-state readback. Preserve failed receipts; inspect the existing transaction before deciding whether any new attempt is warranted. The tools do not Appeal.

## Interface

| Method | Arguments | Effect |
| --- | --- | --- |
| `seal` | record_id, payload JSON string | Immutable sender-scoped registration; at most 16 records per sender |
| `analyze` | record_id, expected_revision=0 | Owner-only semantic consensus and proof; revision becomes 1 |
| `get_record` | owner, record_id | JSON string or empty string when absent |
| `get_protocol` | none | Version identifier `tokenweave-1` |

[Mechanism and certificates](PROTOCOL.md) · [Security and limitations](SECURITY.md) · [Network evidence](EVIDENCE.md)
