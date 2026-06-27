#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sqlite3
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

HEX64 = re.compile(r"^[0-9a-f]{64}$")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_only_connect(path: str) -> sqlite3.Connection:
    db_path = Path(path)
    if not db_path.exists():
        raise FileNotFoundError(f"db not found: {db_path}")
    uri = f"file:{db_path}?mode=ro"
    db = sqlite3.connect(uri, uri=True)
    db.row_factory = sqlite3.Row
    return db


def looks_hash(value: str) -> bool:
    return bool(HEX64.match(value))


def make_ref(ref_kind: str, ref: str, owner: str) -> dict[str, str]:
    return {"ref_kind": ref_kind, "ref": ref, "owner": owner}


def normalize_inserted_at(value: Any) -> str:
    if isinstance(value, str) and value.strip():
        return value
    return now_iso()


def logline_projection(db: sqlite3.Connection, request: dict[str, Any]) -> dict[str, Any]:
    intent = str(request.get("intent") or "overview")
    scope = str(request.get("scope") or "all").strip() or "all"

    if looks_hash(scope):
        row = db.execute(
            """
            SELECT content_hash, tuple_hash, inserted_at, act
            FROM logline_acts
            WHERE content_hash = ?
            """,
            (scope,),
        ).fetchone()
        if row is None:
            raise LookupError(f"logline receipt not found: {scope}")
        receipt = json.loads(row["act"])
        source_refs = [make_ref("content_hash", row["content_hash"], "logline")]
        for field in ("this", "process_contract_hash", "result_hash", "source_hash", "grant_id"):
            value = receipt.get(field)
            if isinstance(value, str) and looks_hash(value):
                source_refs.append(make_ref("content_hash", value, "logline"))
        summary = (
            f"did={receipt.get('did', '') or '-'} "
            f"status={receipt.get('status', '') or '-'} "
            f"if_ok={receipt.get('if_ok', '') or '-'} "
            f"when={receipt.get('when', '') or '-'}"
        )
        return {
            "projection_id": f"logline_local_{scope}",
            "intent": intent,
            "jurisdiction": "logline",
            "default_owner": "logline",
            "freshness": {
                "generated_at": now_iso(),
                "as_of": row["content_hash"],
                "stale": False,
            },
            "source_refs": source_refs,
            "blocks": [
                {
                    "block_id": "logline_receipt_detail",
                    "kind": "logline_receipt",
                    "title": row["content_hash"],
                    "body": summary,
                    "source_refs": [ref["ref"] for ref in source_refs],
                }
            ],
            "open_findings": [],
            "warnings": [],
            "affordances": [],
        }

    rows = db.execute(
        """
        SELECT content_hash, inserted_at, status, did, if_ok
        FROM logline_acts
        ORDER BY inserted_at DESC, content_hash DESC
        """
    ).fetchall()
    count = len(rows)
    status_counts = Counter((row["status"] or "unknown") for row in rows)
    did_counts = Counter((row["did"] or "unknown") for row in rows)
    latest_refs = [row["content_hash"] for row in rows[:5]]
    latest_inserted_at = normalize_inserted_at(rows[0]["inserted_at"]) if rows else now_iso()
    summary = f"acts={count}"
    if status_counts:
        summary += " status=" + ", ".join(
            f"{status}:{status_counts[status]}" for status in sorted(status_counts)
        )
    if did_counts:
        summary += " did=" + ", ".join(
            f"{did}:{did_counts[did]}" for did in sorted(did_counts)
        )
    source_refs = [make_ref("content_hash", ref, "logline") for ref in latest_refs]
    if not source_refs:
        source_refs = [make_ref("scope", scope, "logline")]
    return {
        "projection_id": f"logline_local_{intent}_{scope}",
        "intent": intent,
        "jurisdiction": "logline",
        "default_owner": "logline",
        "freshness": {
            "generated_at": latest_inserted_at,
            "as_of": scope,
            "stale": False,
        },
        "source_refs": source_refs,
        "blocks": [
            {
                "block_id": "logline_overview",
                "kind": "summary",
                "title": "LogLine ledger",
                "body": summary,
                "source_refs": [ref["ref"] for ref in source_refs],
            }
        ],
        "open_findings": [],
        "warnings": [],
        "affordances": [],
    }


def fetch_projection_row(
    db: sqlite3.Connection,
    scope: str,
) -> sqlite3.Row | None:
    if looks_hash(scope):
        return db.execute(
            """
            SELECT projection_hash, stream_id, built_by, audience, narrative_json,
                   open_findings_json, as_of_seq, generated_at, source_json, identity_body_json
            FROM projections
            WHERE projection_hash = ?
            """,
            (scope,),
        ).fetchone()
    if scope != "all":
        return db.execute(
            """
            SELECT projection_hash, stream_id, built_by, audience, narrative_json,
                   open_findings_json, as_of_seq, generated_at, source_json, identity_body_json
            FROM projections
            WHERE stream_id = ?
            ORDER BY as_of_seq DESC, generated_at DESC
            LIMIT 1
            """,
            (scope,),
        ).fetchone()
    return db.execute(
        """
        SELECT projection_hash, stream_id, built_by, audience, narrative_json,
               open_findings_json, as_of_seq, generated_at, source_json, identity_body_json
        FROM projections
        ORDER BY generated_at DESC, as_of_seq DESC
        LIMIT 1
        """
    ).fetchone()


def envelope_row_to_projection(row: sqlite3.Row) -> dict[str, Any]:
    identity = json.loads(row["identity_body_json"]) if row["identity_body_json"] else {}
    return {
        "projection_hash": row["projection_hash"],
        "stream_id": row["stream_id"],
        "built_by": row["built_by"],
        "audience": row["audience"],
        "narrative": json.loads(row["narrative_json"]),
        "open_findings": json.loads(row["open_findings_json"]),
        "as_of_seq": row["as_of_seq"],
        "generated_at": row["generated_at"],
        "source": json.loads(row["source_json"]),
        "pin": identity.get("pin"),
        "parent_projection_hashes": identity.get("parent_projection_hashes"),
        "ladder_level": identity.get("ladder_level"),
        "ttl_ms": identity.get("ttl_ms"),
        "stale": identity.get("stale"),
        "rebuild_reason": identity.get("rebuild_reason"),
        "loss_accounting": identity.get("loss_accounting"),
    }


def block_identity(block: dict[str, Any]) -> str:
    return str(block.get("block_id") or "")


def block_body(block: dict[str, Any]) -> str:
    return json.dumps(
        {
            "kind": block.get("kind"),
            "ref": block.get("ref"),
            "title": block.get("title"),
            "body": block.get("body"),
            "risk": block.get("risk"),
        },
        sort_keys=True,
        separators=(",", ":"),
    )


def delta(from_values: list[str], to_values: list[str]) -> dict[str, list[str]]:
    from_set = set(from_values)
    to_set = set(to_values)
    return {
        "added": sorted(value for value in to_values if value not in from_set),
        "removed": sorted(value for value in from_values if value not in to_set),
    }


def envelope_diff(db: sqlite3.Connection, scope: str) -> dict[str, Any]:
    if scope != "all":
        rows = db.execute(
            """
            SELECT projection_hash, stream_id, built_by, audience, narrative_json,
                   open_findings_json, as_of_seq, generated_at, source_json, identity_body_json
            FROM projections
            WHERE stream_id = ?
            ORDER BY as_of_seq DESC, generated_at DESC
            LIMIT 2
            """,
            (scope,),
        ).fetchall()
    else:
        rows = db.execute(
            """
            SELECT projection_hash, stream_id, built_by, audience, narrative_json,
                   open_findings_json, as_of_seq, generated_at, source_json, identity_body_json
            FROM projections
            ORDER BY generated_at DESC, as_of_seq DESC
            LIMIT 2
            """
        ).fetchall()
    if len(rows) < 2:
        raise LookupError("envelope projection diff requires at least two stored projections")
    to_projection = envelope_row_to_projection(rows[0])
    from_projection = envelope_row_to_projection(rows[1])
    from_refs = [
        *[str(value) for value in from_projection["source"].get("act_hashes", [])],
        *[str(value) for value in from_projection["source"].get("finding_ids", [])],
    ]
    to_refs = [
        *[str(value) for value in to_projection["source"].get("act_hashes", [])],
        *[str(value) for value in to_projection["source"].get("finding_ids", [])],
    ]
    from_blocks = {block_identity(block): block_body(block) for block in from_projection["narrative"]}
    to_blocks = {block_identity(block): block_body(block) for block in to_projection["narrative"]}
    added = sorted(block_id for block_id in to_blocks if block_id not in from_blocks)
    removed = sorted(block_id for block_id in from_blocks if block_id not in to_blocks)
    changed = sorted(
        block_id
        for block_id in to_blocks
        if block_id in from_blocks and from_blocks[block_id] != to_blocks[block_id]
    )
    return {
        "from_projection_hash": from_projection["projection_hash"],
        "to_projection_hash": to_projection["projection_hash"],
        "from_as_of_seq": from_projection["as_of_seq"],
        "to_as_of_seq": to_projection["as_of_seq"],
        "source_refs": delta(from_refs, to_refs),
        "open_findings": delta(from_projection["open_findings"], to_projection["open_findings"]),
        "narrative_blocks": {
            "added": added,
            "removed": removed,
            "changed": changed,
        },
        "stale_changed": bool(from_projection.get("stale")) != bool(to_projection.get("stale")),
        "generated_at_delta_ms": int(to_projection["generated_at"]) - int(from_projection["generated_at"]),
    }


def envelope_projection(db: sqlite3.Connection, request: dict[str, Any]) -> dict[str, Any]:
    intent = str(request.get("intent") or "overview")
    scope = str(request.get("scope") or "all").strip() or "all"
    if intent == "changes_since":
        return envelope_diff(db, scope)
    row = fetch_projection_row(db, scope)
    if row is None:
        raise LookupError(f"envelope projection not found for scope: {scope}")
    return envelope_row_to_projection(row)


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        print(json.dumps({"error": "usage: runtime-projection-local.py <mode> <db-path> <request-json>"}))
        return 2
    mode, db_path, raw_request = argv[1], argv[2], argv[3]
    request = json.loads(raw_request)
    try:
        db = read_only_connect(db_path)
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        return 2

    try:
        if mode == "logline":
            result = logline_projection(db, request)
        elif mode == "envelope":
            result = envelope_projection(db, request)
        else:
            raise ValueError(f"unsupported mode: {mode}")
        print(json.dumps(result))
        return 0
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        return 2
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
