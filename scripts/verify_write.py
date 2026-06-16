"""Execute real on-chain writes on Bradbury: open_gauntlet then submit_defense.
Tolerant of unknown status codes and non-terminal timeouts."""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402

import genlayer_py.types.transactions as T  # noqa: E402
from genlayer_py.types.transactions import TransactionStatus  # noqa: E402
for code in ("9", "10", "11", "14", "15", "16"):
    T.TRANSACTION_STATUS_NUMBER_TO_NAME.setdefault(code, TransactionStatus.LEADER_TIMEOUT)

OUT = os.path.join(os.path.dirname(__file__), "..", "write_out.txt")
TERMINAL = {"ACCEPTED", "FINALIZED", "UNDETERMINED", "CANCELED"}

lines = []


def log(m):
    lines.append(str(m))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(m)


def poll(client, tx, label, retries=220):
    last = None
    for i in range(retries):
        try:
            full = client.get_transaction(transaction_hash=tx)
            if not isinstance(full, dict):
                full = dict(full)
            name = str(full.get("status_name"))
            if name != last:
                log(label + " status=" + name)
                last = name
            if name in TERMINAL:
                log(label + " FINAL status=" + name + " exec=" + str(full.get("tx_execution_result_name")) + " result=" + str(full.get("result_name")))
                return name, full
        except Exception as e:
            log(label + " poll err " + repr(e)[:140])
        time.sleep(6)
    log(label + " TIMED OUT")
    return None, None


def main():
    root = os.path.dirname(os.path.dirname(__file__))
    addr = sys.argv[1] if len(sys.argv) > 1 else json.load(open(os.path.join(root, "deployment.json")))["address"]
    client, account = make_client()
    log("addr=" + addr + " challenger=" + account.address)

    thesis = "Remote-first companies outperform office-mandated ones because they hire from a global talent pool and cut commuting waste."
    stance = "Defending that remote-first is the superior default operating model for knowledge work."
    target = 2

    tx1 = client.write_contract(address=addr, function_name="open_gauntlet", args=[thesis, stance, target])
    log("open_gauntlet tx=" + str(tx1))
    name1, full1 = poll(client, tx1, "open_gauntlet")

    gid = None
    try:
        page = read_view(client, account, addr, "get_gauntlets", [0])
        log("gauntlets: " + json.dumps(page, default=str)[:1200])
        if page:
            gid = page[-1]["id"]
    except Exception as e:
        log("read err: " + repr(e)[:200])

    if not gid:
        log("no gauntlet id, abort")
        return
    log("gid=" + gid)

    defense = (
        "The rebuttal assumes coordination loss, but async-first remote teams use written decision logs and "
        "overlapping core hours, which preserve coordination while widening the hiring funnel. Empirically, "
        "distributed firms like GitLab and Automattic scaled to thousands without offices, and meta-analyses of "
        "remote knowledge work show equal or higher output per worker once commuting drag is removed. The burden "
        "is on the office-mandate claim to show a causal productivity gain that survives selection effects."
    )
    tx2 = client.write_contract(address=addr, function_name="submit_defense", args=[gid, defense])
    log("submit_defense tx=" + str(tx2))
    name2, full2 = poll(client, tx2, "submit_defense")
    time.sleep(5)
    try:
        g = read_view(client, account, addr, "get_gauntlet", [gid])
        log("gauntlet after defense: " + json.dumps(g, default=str)[:2000])
        log("stats: " + json.dumps(read_view(client, account, addr, "get_stats"), default=str))
    except Exception as e:
        log("read err2: " + repr(e)[:200])
    log("WRITE VERIFY DONE")


if __name__ == "__main__":
    main()
