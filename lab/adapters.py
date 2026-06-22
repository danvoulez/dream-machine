"""Executor adapter registry.

Adapters are dumb leaves: they return AUX fields for a result receipt; they do not
own authority and they never write directly to the ledger.
"""
from __future__ import annotations

from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

from .errors import AdapterError
from .inference import run_inference_adapter

AdapterFn = Callable[[Mapping[str, Any], Mapping[str, Any]], dict[str, Any]]


@dataclass(frozen=True)
class AdapterResult:
    did: str
    status: str
    if_ok: str
    aux: dict[str, Any]


def receipt_adapter(source: Mapping[str, Any], queue_item: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "adapter_class": "internal.receipt",
        "source_hash": source.get("id", queue_item.get("source_hash", "")),
        "source_status": source.get("status", "missing"),
        "external_effect": False,
    }


def projection_adapter(source: Mapping[str, Any], queue_item: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "adapter_class": "projection.rebuild",
        "projection_authoritative": False,
        "projection_rebuildable": True,
        "source_hash": source.get("id", queue_item.get("source_hash", "")),
        "external_effect": False,
    }


REGISTRY: dict[str, AdapterFn] = {
    "receipt": receipt_adapter,
    "projection": projection_adapter,
    "inference": run_inference_adapter,
}


def run_adapter(name: str, source: Mapping[str, Any], queue_item: Mapping[str, Any]) -> dict[str, Any]:
    if name not in REGISTRY:
        raise AdapterError(f"unknown adapter: {name}")
    result = REGISTRY[name](source, queue_item)
    if not isinstance(result, dict):
        raise AdapterError(f"adapter {name} did not return a dict")
    return result
