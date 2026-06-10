ENTRY = {
    "month_key": "2026-05",
    "income_type": "salary",
    "description": "Monthly salary",
    "amount_cop": 5000000,
}


def test_create_and_list_income_by_month(client):
    created = client.post("/income", json=ENTRY)
    assert created.status_code == 201
    body = created.json()
    assert body["id"]
    assert body["amount_cop"] == 5000000
    assert body["currency"] == "COP"  # schema default

    listed = client.get("/income", params={"month_key": "2026-05"})
    assert listed.status_code == 200
    assert [e["id"] for e in listed.json()] == [body["id"]]
