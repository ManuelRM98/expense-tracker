def test_default_budget_and_month_override(client):
    # No rows yet → hardcoded defaults
    default = client.get("/budget/default")
    assert default.status_code == 200
    assert default.json() == {
        "month_key": "default",
        "fixed_pct": 50,
        "variable_pct": 30,
        "savings_pct": 20,
        "is_override": False,
    }

    # Month with no override falls back to the default
    fallback = client.get("/budget/2026-05")
    assert fallback.json()["fixed_pct"] == 50

    # Set a per-month override (must sum to 100)
    override = client.put(
        "/budget/2026-05",
        json={"fixed_pct": 60, "variable_pct": 20, "savings_pct": 20},
    )
    assert override.status_code == 200
    assert override.json()["is_override"] is True

    effective = client.get("/budget/2026-05").json()
    assert effective["fixed_pct"] == 60
    assert effective["is_override"] is True
