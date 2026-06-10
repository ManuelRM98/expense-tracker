DEBT = {
    "direction": "they_owe_me",
    "person": "Carlos",
    "description": "Lunch loan",
    "amount": 100000,
    "created_date": "2026-05-01",
}


def test_create_debt_and_register_payment(client):
    created = client.post("/debts", json=DEBT)
    assert created.status_code == 201
    debt = created.json()
    assert debt["total_paid"] == 0
    assert debt["total_remaining"] == 100000

    paid = client.post(
        f"/debts/{debt['id']}/payments",
        json={"amount": 40000, "date": "2026-05-10", "note": "first part"},
    )
    assert paid.status_code == 201
    updated = paid.json()
    assert updated["total_paid"] == 40000
    assert updated["total_remaining"] == 60000
    assert len(updated["payments"]) == 1

    listed = client.get("/debts")
    assert listed.status_code == 200
    assert listed.json()[0]["total_remaining"] == 60000
