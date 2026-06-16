"""Deploy the Steelman contract to Bradbury using the funded .env key."""
import json
import os
import sys

from genlayer_py.types import TransactionStatus

sys.path.insert(0, os.path.dirname(__file__))
from gl import make_client  # noqa: E402


def main():
    client, account = make_client()
    print("Deployer:", account.address)

    root = os.path.dirname(os.path.dirname(__file__))
    code_path = os.path.join(root, "contracts", "contract.py")
    code = open(code_path, "r", encoding="utf-8").read()

    print("Deploying contract.py (", len(code), "bytes )...")
    tx_hash = client.deploy_contract(code=code, args=[])
    print("deploy tx:", tx_hash)

    receipt = client.wait_for_transaction_receipt(
        transaction_hash=tx_hash,
        status=TransactionStatus.ACCEPTED,
        interval=5000,
        retries=240,
    )

    addr = None
    try:
        addr = receipt.get("recipient") if isinstance(receipt, dict) else getattr(receipt, "recipient", None)
    except Exception:
        addr = None
    if not addr:
        full = client.get_transaction(transaction_hash=tx_hash)
        addr = full.get("recipient") if isinstance(full, dict) else getattr(full, "recipient", None)

    exec_name = None
    if isinstance(receipt, dict):
        exec_name = receipt.get("tx_execution_result_name") or receipt.get("status_name")
    print("execution:", exec_name)
    print("contract address:", addr)

    out = {"tx": str(tx_hash), "address": str(addr)}
    with open(os.path.join(root, "deployment.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    print("wrote deployment.json")


if __name__ == "__main__":
    main()
