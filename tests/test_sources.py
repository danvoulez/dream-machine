from lab.sources import REQUIRED_FILES, REQUIRED_PREFIXES, audit_sources


def test_fontes_source_bundle_audit_covers_project_families():
    result = audit_sources("fontes-dm.zip")
    assert result["ok"], result
    assert result["entries"] == 3330
    assert result["files"] > 2400
    assert result["text_files"] > 700
    assert result["binary_files"] > 1700
    for key in REQUIRED_PREFIXES:
        assert result["required_prefixes"][key]["present"], key
        assert result["required_prefixes"][key]["files"] > 0, key
    for key in REQUIRED_FILES:
        assert result["required_files"][key]["present"], key
    assert result["missing_prefixes"] == []
    assert result["missing_files"] == []
    assert result["json_errors"] == []


def test_source_audit_reports_counts_samples_and_csv_rows():
    result = audit_sources("fontes-dm.zip", sample_limit=2)
    assert result["families"]["Meu-Lab"] > 700
    assert result["families"]["ActGraph"] > 1300
    assert result["suffixes"][".json"] == result["json_files"]
    assert len(result["samples"]["Meu-Lab"]) <= 2
    assert "Users/ubl-ops/fontes-dm/logline_acts_rows.csv" in result["csv_rows"]
