"""
QUAL-07: Rename endpoints for expense categories, saving categories, and card types.
Verifies cascade update to referencing rows and conflict/not-found error cases.
"""


def test_rename_expense_category_cascades(client):
    """Renaming a category updates all expenses that reference it."""
    # Create expense with "Food" category (seeded by default)
    client.post("/expenses", json={
        "date": "2026-05-10", "desc": "Lunch", "category": "Food",
        "price": 100, "card_pay": "No", "who_paid": "Manuel",
    })

    res = client.put("/categories/expenses/Food", json={"new_name": "Dining"})
    assert res.status_code == 200
    assert "Dining" in res.json()
    assert "Food" not in res.json()

    # The existing expense must now have the new category
    expenses = client.get("/expenses").json()
    assert expenses[0]["category"] == "Dining"


def test_rename_expense_category_404_on_missing(client):
    res = client.put("/categories/expenses/NonExistent", json={"new_name": "Other"})
    assert res.status_code == 404


def test_rename_expense_category_409_on_conflict(client):
    """Cannot rename to a name that already exists."""
    # "Food" and "Transport" are both seeded
    res = client.put("/categories/expenses/Food", json={"new_name": "Transport"})
    assert res.status_code == 409


def test_rename_saving_category_cascades(client):
    """Renaming a saving category updates all savings that reference it."""
    client.post("/savings", json={
        "date": "2026-05-10", "desc": "ETF", "category": "Investment",
        "price": 500, "card_pay": "No",
    })

    res = client.put("/categories/savings/Investment", json={"new_name": "ETF Fund"})
    assert res.status_code == 200
    assert "ETF Fund" in res.json()

    savings = client.get("/savings").json()
    assert savings[0]["category"] == "ETF Fund"


def test_rename_saving_category_404_on_missing(client):
    res = client.put("/categories/savings/NoSuchCategory", json={"new_name": "Other"})
    assert res.status_code == 404


def test_rename_card_type_cascades(client):
    """Renaming a card type updates all expenses that reference it."""
    client.post("/expenses", json={
        "date": "2026-05-10", "desc": "Purchase", "category": "Food",
        "price": 200, "card_pay": "Yes", "who_paid": "Manuel",
        "card_type": "Davivienda",
    })

    res = client.put("/cards/Davivienda/rename", json={"new_name": "Bancolombia"})
    assert res.status_code == 200
    cards = {c["name"] for c in res.json()}
    assert "Bancolombia" in cards
    assert "Davivienda" not in cards

    expenses = client.get("/expenses").json()
    assert expenses[0]["card_type"] == "Bancolombia"


def test_rename_card_type_404_on_missing(client):
    res = client.put("/cards/NoSuchCard/rename", json={"new_name": "Other"})
    assert res.status_code == 404


def test_rename_card_type_409_on_conflict(client):
    """Cannot rename to an existing card type name."""
    client.post("/cards", json={"name": "Nequi"})
    res = client.put("/cards/Davivienda/rename", json={"new_name": "Nequi"})
    assert res.status_code == 409
