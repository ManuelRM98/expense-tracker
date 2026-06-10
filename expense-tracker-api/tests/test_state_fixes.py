"""
STATE-05: Deleting an expense must NULL out linked_expense_id on any debts
          that reference it.
PERF-01: GET /debts uses a bulk query instead of N+1 per-debt queries (tested
         via observable behavior — same results as before, not a perf assertion).
"""

DEBT_BASE = {
    "direction": "they_owe_me",
    "person": "Carlos",
    "description": "Loan",
    "amount": 50000,
    "created_date": "2026-05-01",
}

EXPENSE = {
    "date": "2026-05-10",
    "desc": "Shared dinner",
    "category": "Food",
    "price": 50000,
    "card_pay": "No",
    "who_paid": "Manuel",
}


def test_delete_expense_clears_linked_expense_id(client):
    """STATE-05: deleting an expense must null out debt's linked_expense_id."""
    # Create expense, then create a debt linked to it
    exp = client.post("/expenses", json=EXPENSE).json()
    exp_id = exp["id"]

    debt_payload = {**DEBT_BASE, "linked_expense_id": exp_id}
    debt = client.post("/debts", json=debt_payload).json()
    assert debt["linked_expense_id"] == exp_id

    # Delete the expense
    res = client.delete(f"/expenses/{exp_id}")
    assert res.status_code == 204

    # The debt must now have linked_expense_id = None
    debts = client.get("/debts").json()
    assert debts[0]["linked_expense_id"] is None


def test_get_debts_with_multiple_debts_and_payments(client):
    """PERF-01: bulk payment query returns correct data for multiple debts."""
    # Create two debts
    d1 = client.post("/debts", json={**DEBT_BASE, "person": "Ana"}).json()
    d2 = client.post("/debts", json={**DEBT_BASE, "person": "Bob"}).json()

    # Add payments to each
    client.post(f"/debts/{d1['id']}/payments",
                json={"amount": 10000, "date": "2026-05-05", "note": ""})
    client.post(f"/debts/{d2['id']}/payments",
                json={"amount": 20000, "date": "2026-05-06", "note": ""})

    debts = client.get("/debts").json()
    assert len(debts) == 2

    by_person = {d["person"]: d for d in debts}
    assert by_person["Ana"]["total_paid"] == 10000
    assert by_person["Ana"]["total_remaining"] == 40000
    assert by_person["Bob"]["total_paid"] == 20000
    assert by_person["Bob"]["total_remaining"] == 30000
