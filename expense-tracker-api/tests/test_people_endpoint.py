"""
DEBT-05: GET /expenses/people returns distinct non-empty who_paid values (sorted).
Also verifies that who_paid is normalized (whitespace stripped) on write.
"""

BASE = {
    "date": "2026-05-10",
    "desc": "Lunch",
    "category": "Food",
    "price": 100,
    "card_pay": "No",
}


def test_people_empty_when_no_expenses(client):
    res = client.get("/expenses/people")
    assert res.status_code == 200
    assert res.json() == []


def test_people_returns_distinct_sorted_values(client):
    client.post("/expenses", json={**BASE, "who_paid": "Carlos"})
    client.post("/expenses", json={**BASE, "who_paid": "Ana"})
    client.post("/expenses", json={**BASE, "who_paid": "Carlos"})   # duplicate

    res = client.get("/expenses/people")
    assert res.status_code == 200
    assert res.json() == ["Ana", "Carlos"]   # sorted, deduplicated


def test_who_paid_whitespace_is_normalized(client):
    """Leading/trailing whitespace must be stripped to prevent chart-segment splits."""
    client.post("/expenses", json={**BASE, "who_paid": "  Manuel  "})
    client.post("/expenses", json={**BASE, "who_paid": "Manuel"})

    res = client.get("/expenses/people")
    assert res.json() == ["Manuel"]   # both normalise to same value, one result
