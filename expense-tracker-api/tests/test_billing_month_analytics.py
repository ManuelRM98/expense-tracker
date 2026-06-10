"""
BUG-03: Analytics monthly/annual/trend must respect billing_month.
An expense with billing_month set counts in that month, not in its date's month.
"""

DATE_MONTH   = "2026-03"   # transaction date month
BILLING_MONTH = "2026-04"  # billing override month

# Expense dated in March but billed in April
EXPENSE = {
    "date": f"{DATE_MONTH}-15",
    "desc": "Credit card charge",
    "category": "Food",
    "price": 2000,
    "card_pay": "Yes",
    "who_paid": "Manuel",
    "card_type": "Davivienda",
    "billing_month": BILLING_MONTH,
}


def test_monthly_summary_uses_billing_month(client):
    """Expense with billing_month=April must appear in April, not March, analytics."""
    client.post("/expenses", json=EXPENSE)

    # April analytics must include the expense
    april = client.get(f"/analytics/monthly/{BILLING_MONTH}").json()
    assert april["total_expenses"] == 2000

    # March analytics must NOT include it
    march = client.get(f"/analytics/monthly/{DATE_MONTH}").json()
    assert march["total_expenses"] == 0


def test_annual_summary_uses_billing_month(client):
    """Annual summary must attribute the expense to billing_month's month."""
    client.post("/expenses", json=EXPENSE)

    annual = client.get("/analytics/annual/2026").json()
    months = {m["month_key"]: m for m in annual["months"]}

    # April must show the expense
    assert months.get(BILLING_MONTH, {}).get("total_expenses", 0) == 2000
    # March must NOT show the expense
    assert months.get(DATE_MONTH, {}).get("total_expenses", 0) == 0

    # Total should count it once
    assert annual["total_expenses"] == 2000


def test_trend_uses_billing_month(client):
    """Trend endpoint must attribute the expense to billing_month."""
    client.post("/expenses", json=EXPENSE)

    # Request 24 months to ensure both months are included
    points = client.get("/analytics/trend", params={"months": 24}).json()
    month_map = {p["month_key"]: p for p in points}

    # billing_month (April) must carry the expense
    april = month_map.get(BILLING_MONTH)
    march = month_map.get(DATE_MONTH)

    if april is not None:
        assert april["total_expenses"] == 2000
    if march is not None:
        assert march["total_expenses"] == 0
