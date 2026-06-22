"""LogLine Foundation conformance runner."""
from __future__ import annotations

import json
import re
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from .receipt import canonical_json

FOUNDATION_PREFIX = "Users/ubl-ops/fontes-dm/Meu-Lab/external/LogLine-Foundation/"


def _extract_foundation(zip_path: str | Path, destination: Path) -> Path:
    with zipfile.ZipFile(zip_path) as archive:
        for name in archive.namelist():
            if not name.startswith(FOUNDATION_PREFIX) or name.endswith("/"):
                continue
            target = destination / name.removeprefix(FOUNDATION_PREFIX)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.read(name))
    return destination


def _run_node(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", str(repo / "conformance" / "tools" / "verify-receipt.mjs"), *args],
        cwd=repo / "conformance",
        capture_output=True,
        text=True,
        check=False,
    )


def _suite_counts(stdout: str) -> tuple[int, int]:
    match = re.search(r"(\d+) passed, (\d+) failed", stdout)
    if not match:
        return 0, 1
    return int(match.group(1)), int(match.group(2))


def verify_foundation_suite(zip_path: str | Path = "fontes-dm.zip") -> dict[str, Any]:
    with tempfile.TemporaryDirectory() as tmp:
        repo = _extract_foundation(zip_path, Path(tmp))
        proc = _run_node(repo, "--suite")
        passed, failed = _suite_counts(proc.stdout)
        return {
            "ok": proc.returncode == 0 and failed == 0,
            "zip": str(zip_path),
            "passed": passed,
            "failed": failed,
            "returncode": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
        }


def verify_engine_receipt(receipt: dict[str, Any], zip_path: str | Path = "fontes-dm.zip") -> dict[str, Any]:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        repo = _extract_foundation(zip_path, tmp_path / "foundation")
        receipt_path = tmp_path / "receipt.json"
        receipt_path.write_text(canonical_json(receipt), encoding="utf-8")
        proc = _run_node(repo, str(receipt_path))
        kind = "receipt" if "receipt" in proc.stdout else "unknown"
        return {
            "ok": proc.returncode == 0,
            "kind": kind,
            "returncode": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
        }


def verify_receipt_file(path: str | Path, zip_path: str | Path = "fontes-dm.zip") -> dict[str, Any]:
    with open(path, encoding="utf-8") as handle:
        receipt = json.load(handle)
    return verify_engine_receipt(receipt, zip_path)
