# -*- coding: utf-8 -*-
"""Balance MC answer keys per lesson, skipping questions whose explanation cites a position.

Lessons (unlike the Basics track) never shuffle options at runtime, so the authored answer
index is exactly what the learner sees. A skewed key is directly exploitable — before this
ran, always picking option A scored 62% in lesson 55.

Assignment is a balanced deal (round-robin over a deterministically shuffled order) rather
than an independent per-question hash: with only ~33 questions per lesson, independent
hashing still leaves one bucket near 42% by chance alone.

Explanations that reference an option by position (①, বিকল্প ২, 두 번째 …) cannot be rotated
without becoming wrong, so those keep their index and their slots are pre-counted so the
remaining deal compensates.
"""
import json, re, sys, hashlib
from collections import Counter

POS = re.compile(r'বিকল্প\s*[১২৩৪1234]|option\s*[1234]|보기\s*[1234]|[①②③④]|첫\s*번째|두\s*번째|세\s*번째|네\s*번째')
dry = "--dry-run" in sys.argv

def rng(seed: str):
    h = int.from_bytes(hashlib.sha256(seed.encode()).digest()[:8], "big")
    def nxt():
        nonlocal h
        h = (h * 6364136223846793005 + 1442695040888963407) & ((1 << 64) - 1)
        return h >> 11
    return nxt

moved = skipped = 0
before, after = Counter(), Counter()

for ch in range(1, 61):
    p = f'content/lessons/lesson-{ch:02d}.json'
    d = json.load(open(p, encoding='utf-8'))
    movable, locked = [], Counter()

    for grp in ('practice', 'epsQuestions'):
        for q in d[grp]:
            opts, a = q.get('options'), q.get('answer')
            if q.get('type') == 'matching' or not opts or not isinstance(a, int):
                continue
            if not (0 <= a < len(opts)):
                continue
            before[a] += 1
            if POS.search(q.get('explanationBn', '')):
                locked[a] += 1
                skipped += 1
            else:
                movable.append(q)

    # Deal targets so each index ends up as even as possible, counting locked ones.
    nxt = rng(f'lesson-{ch}')
    order = sorted(movable, key=lambda q: q['id'])
    for i in range(len(order) - 1, 0, -1):
        j = nxt() % (i + 1)
        order[i], order[j] = order[j], order[i]

    counts = Counter(locked)
    for q in order:
        n = len(q['options'])
        tgt = min(range(n), key=lambda k: (counts[k], nxt() % 1000))
        counts[tgt] += 1
        a = q['answer']
        if tgt != a:
            correct = q['options'][a]
            rest = [o for i, o in enumerate(q['options']) if i != a]
            q['options'] = rest[:tgt] + [correct] + rest[tgt:]
            q['answer'] = tgt
            moved += 1

    for grp in ('practice', 'epsQuestions'):
        for q in d[grp]:
            if q.get('type') != 'matching' and q.get('options') and isinstance(q.get('answer'), int):
                after[q['answer']] += 1

    if not dry:
        json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        open(p, 'a', encoding='utf-8').write('\n')

tb, ta = sum(before.values()), sum(after.values())
print(("DRY RUN — " if dry else "") + f"moved {moved}, kept {skipped} position-referencing")
print("before:", {k: f"{v/tb*100:.1f}%" for k, v in sorted(before.items())})
print("after :", {k: f"{v/ta*100:.1f}%" for k, v in sorted(after.items())})


# ---------------------------------------------------------------------------
# Lessons 52-60 are ASSEMBLED from .lesson-work/<ch>/ fragments. Rewriting only
# content/lessons/*.json would be silently reverted the next time anyone runs
# scripts/assemble-lesson.py, so push the new keys back into the fragments too.
# Fragment names are either "<stem>.json" or split parts "<stem>-N.json".
# ---------------------------------------------------------------------------
import glob, os

def sync_fragments() -> int:
    global unwritable
    synced = 0
    for ch in range(1, 61):
        work = f'.lesson-work/{ch}'
        if not os.path.isdir(work):
            continue
        lesson_path = f'content/lessons/lesson-{ch:02d}.json'
        if not os.path.exists(lesson_path):
            continue
        lesson = json.load(open(lesson_path, encoding='utf-8'))
        by_id = {q['id']: q for grp in ('practice', 'epsQuestions') for q in lesson[grp]}
        frags = []
        for stem in ('practice', 'eps'):
            frags += sorted(glob.glob(f'{work}/{stem}-*.json'))
            bare = f'{work}/{stem}.json'
            if os.path.exists(bare):
                frags.append(bare)
        for frag in frags:
            items = json.load(open(frag, encoding='utf-8'))
            changed = 0
            for it in items:
                src = by_id.get(it.get('id'))
                if not src or it.get('type') == 'matching':
                    continue
                if not (src.get('options') and isinstance(src.get('answer'), int)):
                    continue
                if it.get('options') != src['options'] or it.get('answer') != src['answer']:
                    it['options'] = src['options']
                    it['answer'] = src['answer']
                    changed += 1
            if changed:
                try:
                    json.dump(items, open(frag, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
                    open(frag, 'a', encoding='utf-8').write('\n')
                    synced += changed
                except PermissionError:
                    unwritable.add(frag)
    return synced

unwritable: set[str] = set()
if not dry:
    n = sync_fragments()
    print(f"fragments synced: {n}")
    if unwritable:
        print(f"WARNING: {len(unwritable)} fragment file(s) not writable; re-running "
              f"assemble-lesson.py for those chapters would revert the rebalance:")
        for f in sorted(unwritable)[:10]:
            print(f"  {f}")
