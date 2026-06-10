def test_seeded_expense_categories_and_add(client):
    listed = client.get("/categories/expenses")
    assert listed.status_code == 200
    assert "Food" in listed.json()  # seed default

    added = client.post("/categories/expenses", json={"name": "Pets"})
    assert added.status_code == 201
    assert "Pets" in added.json()


def test_seeded_cards_and_add(client):
    listed = client.get("/cards")
    assert listed.status_code == 200
    assert [c["name"] for c in listed.json()] == ["Davivienda"]  # seed default

    added = client.post("/cards", json={"name": "Nu", "cut_off_day": 15})
    assert added.status_code == 201
    names = {c["name"]: c["cut_off_day"] for c in added.json()}
    assert names["Nu"] == 15
