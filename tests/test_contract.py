import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest
from copy import deepcopy

class Return:
    def __init__(self, value):
        self.calldata = value

class Storage(dict):
    @classmethod
    def __class_getitem__(cls, _):
        return cls

def identity(f):
    return f

gl = types.SimpleNamespace(Contract=object, public=types.SimpleNamespace(view=identity, write=identity),
    message=types.SimpleNamespace(sender_address="0x"+"1"*40),
    vm=types.SimpleNamespace(Return=Return), nondet=types.SimpleNamespace())
sdk = types.ModuleType("genlayer")
sdk.gl, sdk.TreeMap, sdk.u32 = gl, Storage, int
sys.modules["genlayer"] = sdk
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("contract", ROOT/"contracts"/"tokenweave.py")
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)
BASIC = json.loads((ROOT/"examples/basic.json").read_text())

class ContractTests(unittest.TestCase):
    def setUp(self):
        self.data = deepcopy(BASIC)
        gl.message.sender_address = "0x"+"1"*40
        self.obj = c.TokenWeave()
        self.obj.records, self.obj.counts = {}, {}

    def consensus(self, leader, validator=None):
        responses = iter([leader, leader if validator is None else validator])
        gl.nondet.exec_prompt = lambda *a, **k: json.dumps(next(responses))
        def run(fn, check):
            answer = fn()
            if not check(Return(answer)):
                raise Exception("CONSENSUS_REJECTED")
            return answer
        gl.vm.run_nondet_unsafe = run

    def test_namespaces_and_idempotency(self):
        key = self.obj.seal("sample", json.dumps(self.data))
        self.assertEqual(key, self.obj.seal("sample", json.dumps(self.data)))
        self.assertEqual(self.obj.counts["0x"+"1"*40], 1)
        gl.message.sender_address = "0x"+"2"*40
        self.assertEqual(self.obj.get_record(str(gl.message.sender_address), "sample"), "")
        with self.assertRaisesRegex(Exception,"NOT_FOUND"):
            self.obj.analyze("sample", 0)

    def test_invalid_id_and_json(self):
        for name in ["", "Bad ID", "x"*49]:
            with self.assertRaises(Exception):
                self.obj.seal(name, json.dumps(self.data))
        with self.assertRaisesRegex(Exception,"DUPLICATE_KEY"):
            c.unpack('{"a":1,"a":2}')

    def test_failure_does_not_store_assessment(self):
        key = self.obj.seal("sample", json.dumps(self.data))
        before = deepcopy(self.obj.records)
        gl.nondet.exec_prompt = lambda *a, **k: (_ for _ in ()).throw(Exception("MODEL_UNAVAILABLE"))
        gl.vm.run_nondet_unsafe = lambda leader, validator: leader()
        with self.assertRaisesRegex(Exception,"MODEL_UNAVAILABLE"):
            self.obj.analyze("sample", 0)
        self.assertEqual(before, self.obj.records)

    def test_revision_guard(self):
        self.obj.seal("sample", json.dumps(self.data))
        with self.assertRaisesRegex(Exception,"STALE_REVISION"):
            self.obj.analyze("sample", 1)

    def answer(self, take=[1,0], put=[0,1], read=[0,0], status="EXACT"):
        return {"transitions":[{"status":status,"take":take,"put":put,"read":read}]}

    def test_real_contract_lifecycle_with_mocked_consensus(self):
        self.consensus(self.answer())
        self.obj.seal("sample", json.dumps(self.data))
        result = json.loads(self.obj.analyze("sample",0))
        self.assertEqual(result["state"], "REACHABLE")
        self.assertEqual(result["proof"]["shortest_trace"],[0])
        self.assertEqual(result["revision"],1)
        self.assertEqual(len(result["result_hash"]),64)
        with self.assertRaisesRegex(Exception,"TERMINAL_RECORD"):
            self.obj.analyze("sample",1)

    def test_validator_rejects_changed_resource_semantics(self):
        self.consensus(self.answer(), self.answer(take=[0,0]))
        with self.assertRaisesRegex(Exception,"CONSENSUS_REJECTED"):
            c.independent_agreement(self.data,c.parse_answer)

    def test_unknown_has_no_reachability_claim(self):
        a=self.answer([0,0],[0,0],[0,0],"UNKNOWN")
        self.assertEqual(c.solve(self.data,c.parse_answer(a,self.data)),
                         {"status":"REVIEW","unknown_transitions":[0]})
        with self.assertRaisesRegex(Exception,"UNKNOWN_EFFECT"):
            c.parse_answer(self.answer(status="UNKNOWN"),self.data)

    def test_read_arcs_do_not_consume(self):
        t={"take":[0,0],"put":[0,1],"read":[1,0]}
        self.assertEqual(c.fire((1,0),t,[2,2]),(1,1))
        self.assertIsNone(c.fire((0,0),t,[2,2]))

    def test_capacity_and_self_loop(self):
        t={"take":[0],"put":[1],"read":[0]}
        self.assertIsNone(c.fire((1,),t,[1]))
        t={"take":[1],"put":[1],"read":[1]}
        self.assertEqual(c.fire((1,),t,[1]),(1,))

    def test_unreachable_and_initial_target(self):
        d=deepcopy(self.data);d["initial"]=[0,0]
        p=c.solve(d,self.answer())
        self.assertEqual(p["status"],"UNREACHABLE")
        self.assertEqual(p["deadlocks"][0]["trace"],[])
        d["target"]=[0,0]
        self.assertEqual(c.solve(d,self.answer())["shortest_trace"],[])

    def test_full_small_net_against_independent_relational_closure(self):
        import itertools
        states=list(itertools.product(range(2),repeat=2))
        for take in states:
            for put in states:
                for read in states:
                    t={"status":"EXACT","take":list(take),"put":list(put),"read":list(read)}
                    relation=[]
                    for m in states:
                        if all(m[i]>=take[i] and m[i]>=read[i] for i in range(2)):
                            nxt=tuple(m[i]-take[i]+put[i] for i in range(2))
                            if nxt in states:relation.append((m,nxt))
                    reached={(0,1)}
                    while True:
                        nxt=reached|{b for a,b in relation if a in reached}
                        if nxt==reached:break
                        reached=nxt
                    d={"initial":[0,1],"target":[1,0],"capacities":[1,1]}
                    p=c.solve(d,{"transitions":[t]})
                    self.assertEqual({tuple(m) for m in p["reachable_markings"]},reached)

    def test_bad_numeric_values(self):
        for bad in [True,-1,4,1.2]:
            with self.assertRaises(Exception):c.parse_answer(self.answer(take=[bad,0]),self.data)

if __name__ == "__main__":
    unittest.main()
