import json
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402

client, account = make_client()
print("address:", account.address)
payload = {"jsonrpc": "2.0", "id": 1, "method": "eth_getBalance", "params": [account.address, "latest"]}
req = urllib.request.Request(
    "https://rpc-bradbury.genlayer.com",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
)
res = json.loads(urllib.request.urlopen(req).read().decode())
wei = int(res["result"], 16)
print("balance wei:", wei)
print("balance GEN:", wei / 10**18)
