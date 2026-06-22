from dataclasses import dataclass, field
from pathlib import Path
import re
from typing import Any

@dataclass(frozen=True)
class ProcessContract:
    process_id: str
    title: str = ""
    status: str = "active"
    kind: str = ""
    version: str = ""
    owner: str = ""
    process_class: str = ""
    organ: str = "law"
    wakes: tuple[str, ...] = ()
    requires_infra: tuple[str, ...] = ()
    composable: bool = False
    requires_target_hash: bool = False
    idempotency: str = "none"
    evidence_required: bool = False
    required_slots: tuple[str, ...] = ()
    must_include: tuple[str, ...] = ()
    optional_aux: tuple[str, ...] = ()
    allowed_who: tuple[str, ...] = ()
    required_grants: tuple[str, ...] = ()
    adapters: tuple[str, ...] = ()
    danger_tier: str = "L0"
    evidence_obligation: str = "separate-result-act"
    evidence_must_include: tuple[str, ...] = ()
    budget_policy: dict[str, str] = field(default_factory=dict)
    closure_shape: dict[str, str] = field(default_factory=dict)
    if_doubt_behavior: str = "attention_raise"
    runtime_readiness_checks: tuple[str, ...] = ()
    doubt_path: str = "attention-raise.v1"

DEFAULT_REQUIRED=("who","did","this","when","confirmed_by","if_ok","if_doubt","if_not","status")

def _list(line: str) -> tuple[str, ...]:
    m=re.search(r"\[(.*)\]", line)
    if not m: return ()
    return tuple(x.strip().strip('"\'') for x in m.group(1).split(',') if x.strip())

def _parse_value(value: str) -> Any:
    value=value.strip()
    if value.startswith("[") and value.endswith("]"):
        return _list(f"x: {value}")
    if value in {"true", "false"}:
        return value == "true"
    return value.strip('"\'')

def _parent(stack: list[tuple[int, str]], indent: int) -> str:
    parents=[key for level,key in stack if level < indent]
    return ".".join(parents)

def load_contract(path: str | Path) -> ProcessContract:
    data={
        "status": "active",
        "required_slots": DEFAULT_REQUIRED,
        "must_include": (),
        "optional_aux": (),
        "adapters": (),
        "danger_tier": "L0",
        "budget_policy": {},
        "closure_shape": {},
    }
    slot_levels: dict[str, str] = {}
    stack: list[tuple[int, str]] = []
    for raw in Path(path).read_text().splitlines():
        if not raw.strip() or raw.strip().startswith('#'): continue
        indent=len(raw) - len(raw.lstrip(" "))
        line=raw.strip()
        while stack and stack[-1][0] >= indent:
            stack.pop()
        parent=_parent(stack, indent)
        if line.endswith(":") and not line.startswith("- "):
            stack.append((indent, line[:-1].strip()))
            continue
        if not line or line.startswith('#'): continue
        if ":" not in line:
            continue
        key, raw_value = line.split(':',1)
        key=key.strip()
        value=_parse_value(raw_value)
        if parent == "activation_ritual.required_slots":
            slot_levels[key] = str(value)
            continue
        if key == 'process_id': data['process_id']=str(value)
        elif key in {'title','status','kind','version','owner','process_class','organ','idempotency','doubt_path'}:
            data[key]=str(value)
        elif key in {'composable','requires_target_hash','evidence_required'}:
            data[key]=bool(value)
        elif key in {'wakes','requires_infra','adapters'}:
            data[key]=tuple(value) if isinstance(value, tuple) else (str(value),)
        elif key == 'required_slots':
            data['required_slots']=tuple(value) if isinstance(value, tuple) else DEFAULT_REQUIRED
        elif parent == 'activation_ritual' and key == 'required_aux':
            data['must_include']=tuple(value) if isinstance(value, tuple) else (str(value),)
        elif parent == 'activation_ritual' and key == 'optional_aux':
            data['optional_aux']=tuple(value) if isinstance(value, tuple) else (str(value),)
        elif parent == 'authority_scope' and key == 'allowed_who':
            data['allowed_who']=tuple(value) if isinstance(value, tuple) else (str(value),)
        elif parent == 'authority_scope' and key == 'required_grants':
            data['required_grants']=tuple(value) if isinstance(value, tuple) else (str(value),)
        elif parent == 'adapter' and key == 'name':
            data['adapters']=(str(value),)
        elif key == 'danger_tier':
            data['danger_tier']=str(value)
        elif parent == 'adapter' and key == 'danger_tier':
            data['danger_tier']=str(value)
        elif key == 'evidence_obligation' and not parent:
            data['evidence_obligation']=str(value)
        elif key == 'evidence_must_include' and not parent:
            data['evidence_must_include']=tuple(value) if isinstance(value, tuple) else (str(value),)
        elif parent == 'evidence_obligation' and key == 'required':
            data['evidence_required']=bool(value)
            data['evidence_obligation']='required' if value else 'none'
        elif parent == 'evidence_obligation' and key == 'must_include':
            data['evidence_must_include']=tuple(value) if isinstance(value, tuple) else (str(value),)
        elif key in {'must_include','required_aux'}:
            data['must_include']=tuple(value) if isinstance(value, tuple) else (str(value),)
        elif key == 'optional_aux':
            data['optional_aux']=tuple(value) if isinstance(value, tuple) else (str(value),)
        elif key == 'allowed_who':
            data['allowed_who']=tuple(value) if isinstance(value, tuple) else (str(value),)
        elif key == 'required_grants':
            data['required_grants']=tuple(value) if isinstance(value, tuple) else (str(value),)
        elif parent == 'budget_policy':
            data.setdefault('budget_policy', {})[key]=str(value)
        elif parent == 'closure_shape':
            data.setdefault('closure_shape', {})[key]=str(value)
        elif parent == 'if_doubt' and key == 'behavior':
            data['if_doubt_behavior']=str(value)
        elif parent == 'runtime_readiness' and key == 'checks':
            data['runtime_readiness_checks']=tuple(value) if isinstance(value, tuple) else (str(value),)
    if slot_levels:
        data['required_slots']=tuple(slot_levels.keys())
    if 'process_id' not in data: raise ValueError(f"missing process_id in {path}")
    return ProcessContract(**data)

def load_catalog(root: str | Path = 'processes') -> dict[str, ProcessContract]:
    return {c.process_id:c for c in (load_contract(p) for p in Path(root).glob('*.v1.yml'))}
