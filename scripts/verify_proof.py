"""Validate captured mathematical certificates without invoking models or the network."""
import itertools
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
journal = json.loads((root / 'evidence/live.json').read_text())
for example in journal['records']:
    record = example['record']
    data, accepted, proof = record['input'], record['accepted'], record['proof']
    if 'transitions' in accepted:
        ts = accepted['transitions']
        unknown = [i for i, t in enumerate(ts) if t['status'] == 'UNKNOWN']
        if unknown:
            assert proof == {'status': 'REVIEW', 'unknown_transitions': unknown}
            print(example['id'], 'UNKNOWN blocks reachability claims')
            continue
        states = list(itertools.product(*[range(c+1) for c in data['capacities']]))
        relation = {}
        for marking in states:
            edges = []
            for tindex, transition in enumerate(ts):
                if any(marking[i] < transition['take'][i] or marking[i] < transition['read'][i]
                       for i in range(len(marking))):
                    continue
                successor = tuple(marking[i]-transition['take'][i]+transition['put'][i]
                                  for i in range(len(marking)))
                if successor in states:
                    edges.append((tindex, successor))
            relation[marking] = edges
        distances = {tuple(data['initial']): 0}
        while True:
            before = dict(distances)
            for m, distance in before.items():
                for _, successor in relation[m]:
                    distances[successor] = min(distances.get(successor, 100000), distance+1)
            if before == distances:
                break
        listed = [tuple(m) for m in proof['reachable_markings']]
        assert len(listed) == len(set(listed)) == proof['state_count']
        assert set(listed) == set(distances)
        expected_edges = {(listed.index(m), t, listed.index(nxt)) for m in listed for t, nxt in relation[m]}
        assert expected_edges == {tuple(e) for e in proof['edges']}
        deadlocks = {m for m in listed if not relation[m]}
        assert deadlocks == {tuple(w['marking']) for w in proof['deadlocks']}
        def replay(trace):
            m = tuple(data['initial'])
            for step in trace:
                choices = dict(relation[m])
                assert step in choices
                m = choices[step]
            return m
        for witness in proof['deadlocks']:
            m = tuple(witness['marking'])
            assert replay(witness['trace']) == m and len(witness['trace']) == distances[m]
        target = tuple(data['target'])
        assert (target in distances) == (proof['status'] == 'REACHABLE')
        if target in distances:
            assert replay(proof['shortest_trace']) == target
            assert len(proof['shortest_trace']) == distances[target]
        else:
            assert proof['shortest_trace'] is None
    else:
        n = len(data['items'])
        labels = dict(zip(itertools.combinations(range(n), 2), accepted['pairs']))
        for key, unknown_allowed in [('safe', False), ('possible', True)]:
            cert = proof[key]
            feasible = set()
            for mask in range(1, 1 << n):
                items = [i for i in range(n) if mask & (1 << i)]
                if sum(data['sizes'][i] for i in items) > data['capacity']:
                    continue
                if all(labels[p] == 'ALLOW' or (unknown_allowed and labels[p] == 'UNKNOWN')
                       for p in itertools.combinations(items, 2)):
                    feasible.add(mask)
            assert feasible == set(cert['feasible_masks'])
            cost = cert['cost_table']
            assert len(cost) == 1 << n and cost[0] == 0
            for mask in range(1, 1 << n):
                assert cost[mask] == min(1 + cost[mask ^ sub] for sub in feasible if sub & mask == sub)
            assert cert['minimum'] == cost[-1] == len(cert['bins'])
            assert sorted(i for b in cert['bins'] for i in b) == list(range(n))
            assert all(sum(1 << i for i in b) in feasible for b in cert['bins'])
        assert proof['lower_bound'] == proof['possible']['minimum']
        assert proof['upper_bound'] == proof['safe']['minimum']
        assert (proof['status'] == 'OPTIMAL') == (proof['lower_bound'] == proof['upper_bound'])
    print(example['id'], record['state'], 'certificate checked independently')
