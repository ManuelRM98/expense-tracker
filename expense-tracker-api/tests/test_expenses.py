EXPENSE = {
    "date": "2026-05-10",
    "desc": "Groceries",
    "category": "Food",
    "price": 120000,
    "card_pay": "No",
    "who_paid": "Manuel",
}


def test_create_and_list_expense_by_month(client):
    created = client.post("/expenses", json=EXPENSE)
    assert created.status_code == 201
    body = created.json()
    assert body["id"]
    assert body["price"] == 120000
    assert body["cost_type"] == "variable"  # schema default

    listed = client.get("/expenses", params={"month": "2026-05"})
    assert listed.status_code == 200
    assert [e["id"] for e in listed.json()] == [body["id"]]

    # A different month must not include it
    other = client.get("/expenses", params={"month": "2026-04"})
    assert other.json() == []


def test_billing_month_overrides_date_for_month_filter(client):
    payload = {**EXPENSE, "billing_month": "2026-06"}
    created = client.post("/expenses", json=payload).json()

    june = client.get("/expenses", params={"month": "2026-06"}).json()
    may = client.get("/expenses", params={"month": "2026-05"}).json()
    assert [e["id"] for e in june] == [created["id"]]
    assert may == []
