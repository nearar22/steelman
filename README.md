# Steelman

An on-chain AI debate gauntlet. A challenger stakes a thesis and the stance they will defend; an injection-resistant AI "Adversary" issues an opening rebuttal, the challenger answers each round with a defense, and the Adversary rules every round HOLDS, CONCEDES, or COLLAPSES with a 0-100 conviction score under GenLayer validator consensus. A gauntlet ends VINDICATED when the thesis survives all target rounds, or COLLAPSED the moment a defense fails. No deposits, no value transfer. The ruling is the settlement, written to the chain and re-derived by every validator before it counts.

This README is an annotated transcript. Below is the real first gauntlet, `g1`, narrated turn by turn, with a note after each turn explaining exactly what the contract did. Every transaction referenced here is real and on-chain; the links sit at the end.

---

## The problem it solves

Argument quality is usually judged by whoever owns the server. A debate scored by a centralized model is only as trustworthy as the company running it, and the verdict can be silently changed, re-rolled, or tuned after the fact. Steelman moves the judgment itself on-chain. The Adversary is not a chatbot bolted onto a database; its ruling is produced under validator consensus and becomes the authoritative state. No single party, including the operator, can decide a round alone or rewrite a settled gauntlet.

The interrogation framing is the point. You do not get a friendly tutor. You get a relentless but fair opponent whose job is to find the hole in your reasoning, and a deterministic rulebook that the opponent cannot talk its way around.

---

## The transcript: gauntlet g1

### Turn 0, the challenger opens the gauntlet

> CHALLENGER stakes a thesis: that remote-first companies, run deliberately, outperform office-default companies on focus, hiring reach, and retention, and that co-location is a preference dressed up as a requirement.
>
> STANCE: defending remote-first as the superior default for knowledge work.
>
> TARGET ROUNDS: a multi-round gauntlet, the thesis must survive every one.

**What the contract did.** The call `open_gauntlet(thesis, stance, target_rounds)` ran its deterministic guards first: the thesis length was checked against 20-600 characters, the stance against 5-200, and `target_rounds` against 1-10. Only after the guards passed did the contract reach for the model. It invoked the Adversary's opening routine under consensus to generate the first rebuttal, minted the id `g1`, stored the gauntlet as OPEN with conviction seeded at 100 and `awaiting_defense` set true, and returned the id. This is the real transaction `open_gauntlet` recorded on-chain.

### Turn 1, the Adversary issues its opening rebuttal

> ADVERSARY: Your thesis quietly swaps "can work" for "works better." Remote-first removes the friction of presence, but it also removes the unplanned collisions where the best cross-team ideas actually start. Show me that deliberate remote process recovers that serendipity rather than just scheduling around its absence, because retention numbers alone do not prove the work got better.

**What the contract did.** The opening rebuttal was not free text from a single node. It was produced by `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`: a leader node ran the prompt, and every validator independently re-ran it and checked that the leader returned a well-formed, substantive rebuttal. The thesis and stance were passed into the prompt as untrusted data, never as instructions. The agreed rebuttal became `pending_rebuttal` on the stored gauntlet, and the gauntlet now waited for a defense.

### Turn 2, the challenger answers

> CHALLENGER: Serendipity is not free in an office either; it is paid for in interruption and proximity bias. Deliberate remote-first replaces accidental collisions with engineered ones: written proposals open to every team, asynchronous design review that a hallway chat can never match for reach, and rotating cross-team forums on the calendar. The collisions still happen. They are simply legible, searchable, and available to people who were not standing in the right corridor.

**What the contract did.** The challenger called `submit_defense(gauntlet_id, defense)`. The deterministic guards ran before any model call: the gauntlet had to exist, the sender had to be the original challenger and no one else, the gauntlet had to be OPEN and actually awaiting a defense, and the defense text had to be 1-800 characters. The defense passed, so the contract moved to the ruling.

### Turn 3, the Adversary rules the round

> ADVERSARY: Ruling: HOLDS. Conviction 95. You did not dodge the collision problem; you re-engineered it and named the office's hidden cost, proximity bias. The thesis stands firm this round.

**What the contract did.** This is the settlement. The ruling ran through `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` again. The leader produced a verdict object with a ruling string, a conviction integer, a rationale, and a next rebuttal. Each validator re-ran the same adjudication and accepted the leader only if the ruling string matched exactly and the conviction agreed within a tolerance of `max(12, 12 percent)` of the larger value. Consensus returned HOLDS at conviction 95. The deterministic backstop then clamped the conviction into the HOLDS band of 55-100; 95 was already inside, so it stood. The round was appended to the immutable round log and `total_rulings` ticked up. This is the real transaction `submit_defense`, gauntlet `g1`, round 1, ruled HOLDS at conviction 95.

### Turn 4, the gauntlet advances

**What the contract did.** Because the ruling was not COLLAPSES and the round had not yet reached the target, the contract advanced: it incremented the round counter, set `awaiting_defense` back to true, and installed the Adversary's `next_rebuttal` as the new standing attack. Had the model returned no usable next rebuttal, a deterministic fallback rebuttal would have been synthesized so the gauntlet could never stall. Had the ruling been COLLAPSES, the gauntlet would have closed as COLLAPSED on the spot. Had this been the final target round with a non-collapse ruling, it would have closed as VINDICATED.

That is one full round of the loop. It repeats until the thesis either survives every target round (VINDICATED) or fails one (COLLAPSED).

---

## How GenLayer consensus is used

The two writes that matter, the opening rebuttal and each ruling, are both produced through `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`. This is what makes the AI judgment a consensus result rather than one server's opinion.

- **Leader and validator.** A leader node runs `leader_fn`, which calls the model and normalizes the output into a strict object. Every validator runs `validator_fn`, which re-runs the same judgment and decides whether the leader's result is acceptable.
- **Exact ruling match.** For a ruling to count, every validator must agree on the ruling string (HOLDS, CONCEDES, or COLLAPSES) exactly. No fuzzy matching.
- **Conviction tolerance.** Validators do not need a byte-identical number, which would be impossible for a language model. They must agree on conviction within `max(12, 12 percent)` of the larger score, so small natural variation is tolerated while a genuine disagreement fails consensus.
- **Guards before the LLM.** Every cheap, objective check runs deterministically before the model is ever called: length bounds on thesis, stance, and defense; the 1-10 target-rounds bound; challenger-only authorization; and the requirement that the gauntlet be OPEN and awaiting a defense. The model is never asked to enforce rules that arithmetic can enforce.
- **Conviction-band backstops after consensus.** Once consensus returns a ruling, the contract clamps the conviction into the band that ruling requires: COLLAPSES into 0-30, CONCEDES into 25-70, HOLDS into 55-100. A COLLAPSES can never be recorded as confident, and a HOLDS can never look like a defeat.
- **Injection resistance.** The thesis, stance, and defense are always framed as untrusted data, never instructions. If a defense tries to jailbreak the Adversary, impersonate the system or developer, demand a specific ruling, or otherwise manipulate instead of argue, the ruling is forced to COLLAPSES at conviction 0.

---

## Architecture

```
+-------------------------------------------------------------+
|  Frontend (Next.js static export, no server)               |
|                                                             |
|  Interrogation transcript UI  -->  genlayer-js client       |
|   - conversation-first dialogue column                      |
|   - lamp-pool transcript, conviction meter                  |
|   - consensus-as-theater w/ leader-draft peek               |
+----------------------------|--------------------------------+
                             |  reads (views) + writes (txs)
                             v
+-------------------------------------------------------------+
|  Steelman Intelligent Contract (GenLayer)                   |
|                                                             |
|  open_gauntlet ---+                                         |
|  submit_defense --+--> deterministic guards (length, auth,  |
|                   |     status, awaiting-defense)           |
|                   |                                         |
|                   +--> gl.vm.run_nondet_unsafe(             |
|                   |        leader_fn, validator_fn )        |
|                   |     - leader runs the model             |
|                   |     - validators re-run + agree:        |
|                   |         ruling exact, conviction within |
|                   |         max(12, 12%)                     |
|                   |                                         |
|                   +--> deterministic backstops              |
|                         - clamp conviction into band        |
|                         - jailbreak => COLLAPSES / 0         |
|                         - synth fallback rebuttal           |
|                                                             |
|  state: gauntlets, per-gauntlet round log, global stats     |
+-------------------------------------------------------------+
```

The boundary is strict: the contract holds all authoritative state and produces every ruling under consensus; the frontend only reads views and submits writes. There is no backend, no database, and no mock data.

---

## Public methods

### `open_gauntlet(thesis, stance, target_rounds) -> gauntlet_id`

An AI write. Validates lengths and the target-rounds bound deterministically, then issues the Adversary's opening rebuttal through `run_nondet_unsafe` (leader generates, validators confirm a substantive, well-formed rebuttal). Creates the gauntlet as OPEN awaiting a defense and returns its id.

### `submit_defense(gauntlet_id, defense)`

The AI write that rules a round, and the core settlement. Deterministic guards enforce challenger-only authorization, OPEN-and-awaiting status, and the 1-800 character defense bound. The ruling runs through `run_nondet_unsafe`: validators must match the ruling string exactly and agree on conviction within `max(12, 12 percent)`. Backstops then clamp conviction into the per-ruling band and force COLLAPSES at conviction 0 on any manipulation attempt. A COLLAPSES closes the gauntlet; a non-collapse on the final round VINDICATES it; otherwise the round advances with a fresh rebuttal (synthesized if the model gave none).

### `get_stats()`

A view. Returns global counters: total gauntlets, open, vindicated, collapsed, and total rulings.

### `get_gauntlets(start)`

A view. Returns a page of gauntlet summaries starting at the given index.

### `get_gauntlet(gauntlet_id)`

A view. Returns one gauntlet in full, including its complete round-by-round log.

---

## Consensus core (excerpt)

The leader and validator for a ruling. The leader runs the model; each validator re-runs the same judgment and accepts only on an exact ruling match plus conviction within tolerance.

```python
def leader_fn():
    raw = gl.nondet.exec_prompt(prompt, response_format="json")
    return _normalize_verdict(raw)

def validator_fn(leaders_res: gl.vm.Result) -> bool:
    if not isinstance(leaders_res, gl.vm.Return):
        return _handle_leader_error(leaders_res, leader_fn)
    mine = leader_fn()
    theirs = leaders_res.calldata
    if not isinstance(theirs, dict):
        return False
    if mine["ruling"] != theirs.get("ruling"):
        return False
    a = int(mine["conviction"])
    b = int(theirs.get("conviction", -999))
    return abs(a - b) <= max(12, (12 * max(a, b)) // 100)

return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
```

The conviction-band backstop that runs after consensus returns, enforcing what a prompt alone cannot:

```python
if ruling == "COLLAPSES":
    conviction = _clamp(conviction, 0, 30)
elif ruling == "CONCEDES":
    conviction = _clamp(conviction, 25, 70)
else:  # HOLDS
    conviction = _clamp(conviction, 55, 100)
```

The full contract, including the opening-rebuttal routine, the injection-resistance rules in the prompt, and the advance/close logic, lives at [`contracts/contract.py`](contracts/contract.py).

---

## Frontend

Built with Next.js as a static export (`output: 'export'`), talking to the chain through `genlayer-js`, with `framer-motion` for motion and `lucide-react` for iconography. Art direction is a noir interrogation room: a high-contrast ink-black field, bone-white text, a single interrogation-crimson accent, and a hard overhead-lamp pool of light.

Key UX decisions:

- **Conversation-first interrogation interface.** The whole app is the turn-by-turn dialogue gauntlet. The live exchange fills the screen. There is no marketing hero and no card feed.
- **Lamp-pool transcript.** The dialogue types out line by line under a swaying lamp pool, the Adversary and challenger staged as opposing speakers with a conviction meter in the margin.
- **Consensus as theater.** When a round is ruled, the interface stages the consensus moment, including a peek at the leader's draft before validators confirm it, so the settlement reads as a deliberation rather than an instant answer.
- **Slow polling.** State is read on a deliberate cadence rather than hammered, matching the weight of an on-chain ruling.
- **No mock data.** Every gauntlet, round, and verdict shown is read from the contract.

---

## On-chain

- Contract: https://explorer-bradbury.genlayer.com/address/0x2344c3ee47C2f546c5e6Ad205aF20F6E2a06397b
- Deploy transaction: https://explorer-bradbury.genlayer.com/tx/0xe343fc375caf8f901f1fbe4fc1dea30bde130b1495a3671e43b8913c8e0f5abd

The two writes narrated above are on-chain as well: the `open_gauntlet` that created `g1`, and the `submit_defense` that ruled round 1 HOLDS at conviction 95. Both are visible from the contract's address page on the explorer.
