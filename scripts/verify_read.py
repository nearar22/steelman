import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client, read_view  # noqa: E402


def main():
    root = os.path.dirname(os.path.dirname(__file__))
    addr = json.load(open(os.path.join(root, "deployment.json")))["address"]
    if len(sys.argv) > 1:
        addr = sys.argv[1]
    client, account = make_client()
    print("addr:", addr)
    stats = read_view(client, account, addr, "get_stats")
    print("get_stats:", json.dumps(stats, default=str))
    page = read_view(client, account, addr, "get_gauntlets", [0])
    print("get_gauntlets(0):", json.dumps(page, default=str))


if __name__ == "__main__":
    main()
