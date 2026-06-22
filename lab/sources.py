"""Project-wide source bundle audit for ``fontes-dm.zip``.

The Lab implementation spec names the zip as the source bundle for the whole
project, not just pack vectors.  This module walks every zip entry, verifies the
expected source families are present, performs machine checks on JSON material,
and returns a compact operational report that can be run from the CLI.
"""
from __future__ import annotations

import csv
import json
import zipfile
from collections import Counter, defaultdict
from io import TextIOWrapper
from pathlib import Path
from typing import Any

ZIP_ROOT = "Users/ubl-ops/fontes-dm/"

REQUIRED_PREFIXES = {
    "meu_lab": "Users/ubl-ops/fontes-dm/Meu-Lab/",
    "logline_foundation": "Users/ubl-ops/fontes-dm/Meu-Lab/external/LogLine-Foundation/",
    "cli": "Users/ubl-ops/fontes-dm/cli/",
    "actgraph": "Users/ubl-ops/fontes-dm/ActGraph/",
    "projections": "Users/ubl-ops/fontes-dm/projections/",
    "dream_machine": "Users/ubl-ops/fontes-dm/DDMM/",
}

REQUIRED_FILES = {
    "production_runbook": "Users/ubl-ops/fontes-dm/Meu-Lab/16_LAB_PRODUCTION_RUNBOOK.md",
    "logline_acts_migration": "Users/ubl-ops/fontes-dm/ActGraph/migrations/0001_logline_acts.sql",
    "realtime_publication_migration": "Users/ubl-ops/fontes-dm/ActGraph/migrations/0007_realtime_publication.sql",
    "legacy_lab_log_drop": "Users/ubl-ops/fontes-dm/Meu-Lab/migrations/2026-06-21_drop_legacy_lab_log.sql",
    "foundation_conformance": "Users/ubl-ops/fontes-dm/Meu-Lab/external/LogLine-Foundation/conformance/README.md",
    "cli_main": "Users/ubl-ops/fontes-dm/cli/src/main.rs",
    "projection_readme": "Users/ubl-ops/fontes-dm/projections/README.md",
    "dream_machine_readme": "Users/ubl-ops/fontes-dm/DDMM/README.md",
    "pack_contract": "Users/ubl-ops/fontes-dm/Meu-Lab/CORPUS/LAB_PACK.md",
}

TEXT_SUFFIXES = {
    ".act",
    ".csv",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".rs",
    ".sql",
    ".toml",
    ".txt",
    ".yaml",
    ".yml",
}


def _top_family(name: str) -> str:
    if not name.startswith(ZIP_ROOT):
        return "outside_root"
    rest = name[len(ZIP_ROOT) :].strip("/")
    return rest.split("/", 1)[0] if rest else "root"


def _suffix(name: str) -> str:
    return Path(name).suffix.lower() or "<none>"


def _is_file(info: zipfile.ZipInfo) -> bool:
    return not info.is_dir()


def _json_errors(archive: zipfile.ZipFile, infos: list[zipfile.ZipInfo]) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    for info in infos:
        if _suffix(info.filename) != ".json":
            continue
        try:
            json.loads(archive.read(info).decode("utf-8"))
        except Exception as exc:  # JSON fixtures must never be silently skipped.
            errors.append({"path": info.filename, "error": str(exc)})
    return errors


def _csv_counts(archive: zipfile.ZipFile, infos: list[zipfile.ZipInfo]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for info in infos:
        if _suffix(info.filename) != ".csv":
            continue
        with archive.open(info) as raw:
            reader = csv.reader(TextIOWrapper(raw, encoding="utf-8"))
            counts[info.filename] = sum(1 for _ in reader)
    return counts


def _sample_paths(counter: dict[str, list[str]], limit: int) -> dict[str, list[str]]:
    return {key: paths[:limit] for key, paths in sorted(counter.items())}


def audit_sources(zip_path: str | Path = "fontes-dm.zip", *, sample_limit: int = 5) -> dict[str, Any]:
    """Audit the full source bundle and return an operational coverage report."""
    with zipfile.ZipFile(zip_path) as archive:
        infos = archive.infolist()
        files = [info for info in infos if _is_file(info)]
        directories = [info for info in infos if info.is_dir()]
        names = {info.filename for info in infos}
        file_names = {info.filename for info in files}

        by_family = Counter(_top_family(info.filename) for info in files)
        by_suffix = Counter(_suffix(info.filename) for info in files)
        bytes_by_family: dict[str, int] = defaultdict(int)
        samples: dict[str, list[str]] = defaultdict(list)
        text_files = 0
        binary_files = 0
        for info in files:
            family = _top_family(info.filename)
            bytes_by_family[family] += info.file_size
            if len(samples[family]) < sample_limit:
                samples[family].append(info.filename)
            if _suffix(info.filename) in TEXT_SUFFIXES:
                text_files += 1
            else:
                binary_files += 1

        required_prefixes = {
            key: {
                "prefix": prefix,
                "present": any(name.startswith(prefix) for name in names),
                "files": sum(1 for name in file_names if name.startswith(prefix)),
            }
            for key, prefix in REQUIRED_PREFIXES.items()
        }
        required_files = {key: {"path": path, "present": path in file_names} for key, path in REQUIRED_FILES.items()}
        json_errors = _json_errors(archive, files)
        csv_counts = _csv_counts(archive, files)

    missing_prefixes = [key for key, item in required_prefixes.items() if not item["present"]]
    missing_files = [key for key, item in required_files.items() if not item["present"]]
    return {
        "ok": not missing_prefixes and not missing_files and not json_errors,
        "zip": str(zip_path),
        "entries": len(infos),
        "files": len(files),
        "directories": len(directories),
        "text_files": text_files,
        "binary_files": binary_files,
        "families": dict(sorted(by_family.items())),
        "suffixes": dict(sorted(by_suffix.items())),
        "bytes_by_family": dict(sorted(bytes_by_family.items())),
        "samples": _sample_paths(samples, sample_limit),
        "required_prefixes": required_prefixes,
        "required_files": required_files,
        "missing_prefixes": missing_prefixes,
        "missing_files": missing_files,
        "json_files": by_suffix.get(".json", 0),
        "json_errors": json_errors,
        "csv_rows": csv_counts,
    }
