"""LLM inference request and dry-run adapter boundary.

LLM work enters as candidate memory. Consequence still flows through
queue -> executor -> adapter, and this local adapter never calls an external
model.
"""
from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import datetime, timezone
from typing import Any

from .errors import AdapterError
from .receipt import canonical_json, sha256_text
from .store import append


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_inference_request(
    db,
    task: str,
    *,
    model_id: str,
    schema_id: str,
    prompt_id: str | None = None,
    input_hashes: Sequence[str] = (),
    projection_hashes: Sequence[str] = (),
    params: Mapping[str, Any] | None = None,
    mock_output: Mapping[str, Any] | str | None = None,
) -> dict[str, Any]:
    fields: dict[str, Any] = {
        "who": "lab.cli",
        "did": "requested_inference",
        "this": task,
        "when": now(),
        "confirmed_by": "lab.cli",
        "if_ok": "inference.v1",
        "if_doubt": "attention-raise.v1",
        "if_not": "no_model",
        "status": "candidate",
        "task": task,
        "model_id": model_id,
        "prompt_id": prompt_id or f"{task}.v1",
        "schema_id": schema_id,
        "input_hashes": list(input_hashes),
        "projection_hashes": list(projection_hashes),
        "params": dict(params or {"temperature": 0}),
        "model_called": False,
    }
    if mock_output is not None:
        fields["mock_output"] = mock_output
    return append(db, fields)


def _default_output(source: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "summary": f"candidate output for {source.get('task') or source.get('this', '')}",
        "citations": list(source.get("input_hashes", [])) + list(source.get("projection_hashes", [])),
        "requested_action": "register_candidate",
    }


def _validate_output(output: Any) -> dict[str, Any]:
    if not isinstance(output, Mapping):
        raise AdapterError("schema-invalid: inference output must be an object")
    if not isinstance(output.get("summary"), str) or not output["summary"]:
        raise AdapterError("schema-invalid: output.summary must be a non-empty string")
    if not isinstance(output.get("citations"), list):
        raise AdapterError("schema-invalid: output.citations must be a list")
    return dict(output)


def run_inference_adapter(source: Mapping[str, Any], queue_item: Mapping[str, Any]) -> dict[str, Any]:
    output = _validate_output(source.get("mock_output", _default_output(source)))
    output_hash = sha256_text(canonical_json(output))
    candidate = {
        "who": "inference.adapter",
        "did": "candidate.inference_output",
        "this": source.get("id", queue_item.get("source_hash", "")),
        "when": now(),
        "confirmed_by": "inference.dry_run",
        "if_ok": "attention-raise.v1",
        "if_doubt": "attention-raise.v1",
        "if_not": "discard_candidate",
        "status": "candidate",
        "output_hash": output_hash,
        "schema_id": source.get("schema_id", ""),
        "model_id": source.get("model_id", ""),
    }
    return {
        "adapter_class": "inference.dry_run",
        "external_effect": False,
        "model_called": False,
        "model_id": source.get("model_id", ""),
        "prompt_hash": sha256_text(canonical_json({"prompt_id": source.get("prompt_id", "")})),
        "schema_hash": sha256_text(canonical_json({"schema_id": source.get("schema_id", "")})),
        "schema_id": source.get("schema_id", ""),
        "input_hashes": list(source.get("input_hashes", [])),
        "projection_hashes": list(source.get("projection_hashes", [])),
        "output_hash": output_hash,
        "schema_valid": True,
        "citations_valid": True,
        "candidate_acts": [candidate],
    }
