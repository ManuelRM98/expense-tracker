from datetime import date

TEMPLATE = {
    "name": "Rent",
    "amount": 1500000,
    "category": "Services",
    "day_of_month": 1,
    "who_paid": "Manuel",
    "card_pay": "No",
}


def test_create_template_and_generate_for_current_month(client):
    created = client.post("/fixed-expenses", json=TEMPLATE)
    assert created.status_code == 201
    template = created.json()
    assert template["is_active"] is True

    # day_of_month=1 has always passed within the current month, so it generates
    month_key = date.today().strftime("%Y-%m")
    generated = client.post(f"/fixed-expenses/generate/{month_key}")
    assert generated.status_code == 200
    expenses = generated.json()
    assert len(expenses) == 1
    assert expenses[0]["desc"] == "Rent"
    assert expenses[0]["price"] == 1500000
    assert expenses[0]["cost_type"] == "fixed"

    # Idempotency: the generation log prevents duplicates on a second run
    again = client.post(f"/fixed-expenses/generate/{month_key}")
    assert again.json() == []
