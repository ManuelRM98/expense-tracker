MONTH = "2026-03"


def _seed_month(client):
    client.post("/expenses", json={
        "date": f"{MONTH}-05",
        "desc": "Groceries",
        "category": "Food",
        "price": 1000,
        "card_pay": "Yes",
        "who_paid": "Manuel",
        "card_type": "Davivienda",
    })
    client.post("/savings", json={
        "date": f"{MONTH}-10",
        "desc": "Investment",
        "category": "Investment",
        "price": 500,
        "card_pay": "No",
    })
    # Two entries in the same month — must be summed, not .first() (BUG-01)
    client.post("/income", json={
        "month_key": MONTH, "income_type": "salary",
        "description": "Salary", "amount_cop": 3000,
    })
    client.post("/income", json={
        "month_key": MONTH, "income_type": "bonus",
        "description": "Bonus", "amount_cop": 2000,
    })


def test_monthly_summary_sums_all_income_entries(client):
    _seed_month(client)
    res = client.get(f"/analytics/monthly/{MONTH}")
    assert res.status_code == 200
    summary = res.json()
    assert summary["income"] == 5000
    assert summary["total_expenses"] == 1000
    assert summary["total_savings"] == 500
    assert summary["remaining"] == 3500
    assert summary["card_total"] == 1000
    assert summary["cash_total"] == 0
    assert summary["by_category"] == [{"category": "Food", "total": 1000}]


def test_annual_summary(client):
    _seed_month(client)
    res = client.get("/analytics/annual/2026")
    assert res.status_code == 200
    annual = res.json()
    assert annual["total_income"] == 5000
    assert annual["total_expenses"] == 1000
    assert annual["net_balance"] == 3500
    march = next(m for m in annual["months"] if m["month_key"] == MONTH)
    assert march["income"] == 5000
    assert march["balance"] == 3500


def test_trend_returns_requested_number_of_months(client):
    _seed_month(client)
    res = client.get("/analytics/trend", params={"months": 3})
    assert res.status_code == 200
    points = res.json()
    assert len(points) == 3
    assert all({"month_key", "total_expenses", "total_savings"} <= p.keys() for p in points)
