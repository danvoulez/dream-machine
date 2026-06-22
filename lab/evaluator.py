from .contracts import ProcessContract, load_catalog
SLOTS=("who","did","this","when","confirmed_by","if_ok","if_doubt","if_not","status")
DANGEROUS_TIERS = {"L4", "L5"}

def completion(receipt: dict, contract: ProcessContract | None = None) -> dict:
    required=contract.required_slots if contract else SLOTS
    missing=[s for s in required if not str(receipt.get(s,''))]
    include_missing=[s for s in (contract.must_include if contract else ()) if s not in receipt]
    complete=not missing and not include_missing
    return {
        "complete": complete,
        "missing_slots": missing,
        "missing_required_fields": include_missing,
        "missing_aux": include_missing,
        "process_id": contract.process_id if contract else None,
        "activate": complete and contract is not None,
    }

def select_process(receipt: dict, catalog=None) -> ProcessContract | None:
    catalog=catalog or load_catalog()
    wanted=receipt.get('process_id') or receipt.get('if_ok')
    if wanted in catalog: return catalog[wanted]
    for c in catalog.values():
        if completion(receipt,c)['complete']:
            return c
    return None

def evaluate(receipt: dict, process_id: str | None = None, catalog=None) -> dict:
    catalog=catalog or load_catalog()
    contract=catalog.get(process_id) if process_id else select_process(receipt,catalog)
    if not contract:
        base=completion(receipt,None)
        base.update({
            "activate": False,
            "matched": False,
            "registration_state": "registered",
            "activation_state": "inert",
            "queueable": False,
            "reason": "no_matching_process_contract",
            "field_levels": {},
        })
        return base

    out=completion(receipt,contract)
    out.update({
        "matched": True,
        "registration_state": "registered",
        "process_status": contract.status,
        "adapter": contract.adapters[0] if contract.adapters else None,
        "danger_tier": contract.danger_tier,
        "evidence_required": contract.evidence_obligation != "none",
        "evidence_must_include": list(contract.evidence_must_include),
        "allowed_who": list(contract.allowed_who),
        "field_levels": {slot: f"{slot}.present" for slot in SLOTS if str(receipt.get(slot, ""))},
    })
    if contract.status != "active":
        out.update({"activate": False, "activation_state": "inert", "queueable": False, "reason": "process_not_active"})
    elif out["missing_slots"] or out["missing_aux"]:
        out.update({"activate": False, "activation_state": "incompleto", "queueable": False, "reason": "incomplete"})
    elif contract.danger_tier in DANGEROUS_TIERS and "grant_id" not in receipt:
        out.update({"activate": False, "activation_state": "doubted", "queueable": False, "reason": "missing_required_grant"})
    else:
        out.update({"activate": True, "activation_state": "ativável", "queueable": True, "reason": "complete"})
    return out
