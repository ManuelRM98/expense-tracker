"""
FEAT-12: Tests for category endpoints, covering the new object response shape
({name, color}), POST with color, PATCH color set/clear/invalid, and 404 on
missing category.
"""


# ── Helper ─────────────────────────────────────────────────────────────────────

def _names(response_json):
    """Extract name list from list[CategoryOut] response."""
    return [c["name"] for c in response_json]


# ── Expense categories ─────────────────────────────────────────────────────────

def test_seeded_expense_categories_returns_objects(client):
    listed = client.get("/categories/expenses")
    assert listed.status_code == 200
    data = listed.json()
    assert isinstance(data, list)
    # Each item is an object with name and color fields
    assert all("name" in c and "color" in c for c in data)
    assert "Food" in _names(data)


def test_add_expense_category_no_color(client):
    added = client.post("/categories/expenses", json={"name": "Pets"})
    assert added.status_code == 201
    data = added.json()
    assert "Pets" in _names(data)
    pets = next(c for c in data if c["name"] == "Pets")
    assert pets["color"] is None


def test_add_expense_category_with_color(client):
    added = client.post("/categories/expenses", json={"name": "Pets", "color": "#FF5733"})
    assert added.status_code == 201
    data = added.json()
    pets = next(c for c in data if c["name"] == "Pets")
    # Color is normalized to lowercase
    assert pets["color"] == "#ff5733"


def test_expense_category_color_persists_across_get(client):
    client.post("/categories/expenses", json={"name": "Pets", "color": "#AABBCC"})
    listed = client.get("/categories/expenses")
    data = listed.json()
    pets = next(c for c in data if c["name"] == "Pets")
    assert pets["color"] == "#aabbcc"


def test_patch_expense_category_set_color(client):
    res = client.patch("/categories/expenses/Food", json={"color": "#007aff"})
    assert res.status_code == 200
    data = res.json()
    food = next(c for c in data if c["name"] == "Food")
    assert food["color"] == "#007aff"


def test_patch_expense_category_clear_color(client):
    # First set a color
    client.patch("/categories/expenses/Food", json={"color": "#007aff"})
    # Then clear it with explicit null
    res = client.patch("/categories/expenses/Food", json={"color": None})
    assert res.status_code == 200
    data = res.json()
    food = next(c for c in data if c["name"] == "Food")
    assert food["color"] is None


def test_patch_expense_category_invalid_color_returns_422(client):
    res = client.patch("/categories/expenses/Food", json={"color": "not-a-color"})
    assert res.status_code == 422


def test_patch_expense_category_missing_returns_404(client):
    res = client.patch("/categories/expenses/NonExistent", json={"color": "#007aff"})
    assert res.status_code == 404


def test_delete_expense_category_returns_objects(client):
    # Add a second category so we can delete one
    client.post("/categories/expenses", json={"name": "Pets"})
    res = client.delete("/categories/expenses/Pets")
    assert res.status_code == 200
    data = res.json()
    assert all("name" in c and "color" in c for c in data)
    assert "Pets" not in _names(data)


# ── Saving categories ──────────────────────────────────────────────────────────

def test_seeded_saving_categories_returns_objects(client):
    listed = client.get("/categories/savings")
    assert listed.status_code == 200
    data = listed.json()
    assert isinstance(data, list)
    assert all("name" in c and "color" in c for c in data)
    assert "Investment" in _names(data)


def test_add_saving_category_with_color(client):
    added = client.post("/categories/savings", json={"name": "Emergency Fund", "color": "#34C759"})
    assert added.status_code == 201
    data = added.json()
    ef = next(c for c in data if c["name"] == "Emergency Fund")
    assert ef["color"] == "#34c759"


def test_saving_category_color_persists_across_get(client):
    client.post("/categories/savings", json={"name": "Bonds", "color": "#5AC8FA"})
    listed = client.get("/categories/savings")
    data = listed.json()
    bonds = next(c for c in data if c["name"] == "Bonds")
    assert bonds["color"] == "#5ac8fa"


def test_patch_saving_category_set_color(client):
    res = client.patch("/categories/savings/Investment", json={"color": "#FF9500"})
    assert res.status_code == 200
    data = res.json()
    inv = next(c for c in data if c["name"] == "Investment")
    assert inv["color"] == "#ff9500"


def test_patch_saving_category_clear_color(client):
    client.patch("/categories/savings/Investment", json={"color": "#FF9500"})
    res = client.patch("/categories/savings/Investment", json={"color": None})
    assert res.status_code == 200
    data = res.json()
    inv = next(c for c in data if c["name"] == "Investment")
    assert inv["color"] is None


def test_patch_saving_category_invalid_color_returns_422(client):
    res = client.patch("/categories/savings/Investment", json={"color": "blue"})
    assert res.status_code == 422


def test_patch_saving_category_missing_returns_404(client):
    res = client.patch("/categories/savings/NoSuchCategory", json={"color": "#007aff"})
    assert res.status_code == 404


# ── Card types (unchanged shape, kept for regression) ─────────────────────────

def test_seeded_cards_and_add(client):
    listed = client.get("/cards")
    assert listed.status_code == 200
    assert [c["name"] for c in listed.json()] == ["Davivienda"]  # seed default

    added = client.post("/cards", json={"name": "Nu", "cut_off_day": 15})
    assert added.status_code == 201
    names = {c["name"]: c["cut_off_day"] for c in added.json()}
    assert names["Nu"] == 15
