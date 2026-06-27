import json
import os
import subprocess
import sys

import pytest

from lab.errors import AdapterError
from lab.inference import build_inference_request, run_inference_adapter
from lab.runtime import executor_run_once, queue_add
from lab.store import append, connect, get


def test_build_inference_request_registers_candidate_without_calling_model():
    db = connect(":memory:")
    request = build_inference_request(
        db,
        "route_inbound_event",
        model_id="local-dry-run",
        schema_id="route_decision.v1",
        prompt_id="route_inbound_event.v1",
        input_hashes=["a" * 64],
        projection_hashes=["b" * 64],
    )

    stored = get(db, request["id"])
    assert stored["did"] == "requested_inference"
    assert stored["status"] == "candidate"
    assert stored["if_ok"] == "inference.v1"
    assert stored["model_called"] is False
    assert stored["params"] == {"temperature": 0}


def test_inference_adapter_returns_schema_valid_llm_receipt_aux_and_candidate():
    db = connect(":memory:")
    request = build_inference_request(db, "summarize", model_id="local-dry-run", schema_id="summary.v1")

    aux = run_inference_adapter(request, {"queue_id": "queue:test"})

    assert aux["adapter_class"] == "inference.dry_run"
    assert aux["external_effect"] is False
    assert aux["schema_valid"] is True
    assert aux["citations_valid"] is True
    assert aux["candidate_acts"][0]["status"] == "candidate"
    assert aux["candidate_acts"][0]["if_ok"] == "attention-raise.v1"
    assert aux["output_hash"]


def test_inference_adapter_rejects_schema_invalid_output():
    request = {
        "id": "a" * 64,
        "task": "broken",
        "model_id": "local-dry-run",
        "schema_id": "summary.v1",
        "mock_output": "not an object",
    }

    with pytest.raises(AdapterError, match="schema-invalid"):
        run_inference_adapter(request, {"queue_id": "queue:test"})


def test_executor_dispatches_inference_adapter_and_writes_llm_receipt():
    db = connect(":memory:")
    request = build_inference_request(db, "summarize", model_id="local-dry-run", schema_id="summary.v1")
    queue_add(db, request["id"], "inference.v1", adapter="inference")

    closed = executor_run_once(db)
    result = get(db, closed["result_hash"])

    assert result["did"] == "llm.receipt"
    assert result["status"] == "fechado"
    assert result["this"] == request["id"]
    assert result["model_id"] == "local-dry-run"
    assert result["schema_valid"] is True
    assert result["external_effect"] is False
    assert result["candidate_acts"][0]["did"] == "candidate.inference_output"


def test_infer_cli_registers_request_and_executor_handles_it(tmp_path):
    db_path = tmp_path / "lab.sqlite"
    env = os.environ | {"LAB_DB": str(db_path)}
    base_cmd = [sys.executable, "-m", "lab.cli"]
    request_proc = subprocess.run(
        [*base_cmd, "infer", "summarize", "--model", "local-dry-run", "--schema", "summary.v1"],
        cwd=os.getcwd(),
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    request = json.loads(request_proc.stdout)
    subprocess.run(
        [*base_cmd, "queue", "add", request["id"], "--process", "inference.v1", "--adapter", "inference"],
        cwd=os.getcwd(),
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    closed_proc = subprocess.run(
        [*base_cmd, "executor", "run"],
        cwd=os.getcwd(),
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    closed = json.loads(closed_proc.stdout)
    inspect_proc = subprocess.run(
        [*base_cmd, "inspect", closed["result_hash"]],
        cwd=os.getcwd(),
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )

    result = json.loads(inspect_proc.stdout)
    # `lab inspect` returns the read-only portal projection: canonical nine slots
    # under "slots", plus validation and read-only status. It deliberately does not
    # surface non-canonical fields like external_effect (covered by the in-process
    # test above via store.get). See lab/inspect.py docstring.
    assert result["slots"]["did"] == "llm.receipt"
    assert result["slots"]["status"] == "fechado"
    assert result["validation"]["ok"] is True
    assert result["read_only"] is True
