"""FEAT-11: tests for per-card color customization."""
import pytest


# ── helpers ────────────────────────────────────────────────────────────────────

def _add_card(client, name, **extra):
    resp = client.post("/cards", json={"name": name, **extra})
    assert resp.status_code == 201, resp.text
    return resp.json()


def _patch_card(client, name, **fields):
    resp = client.patch(f"/cards/{name}", json=fields)
    assert resp.status_code == 200, resp.text
    return resp.json()


def _find(cards, name):
    return next(c for c in cards if c["name"] == name)


# ── tests ──────────────────────────────────────────────────────────────────────

def test_new_card_defaults_to_null_color(client):
    """Default color is None when not supplied."""
    cards = _add_card(client, "TestCard")
    assert _find(cards, "TestCard")["color"] is None


def test_post_with_color_persists_it(client):
    """POST /cards with color stores and returns it."""
    cards = _add_card(client, "Colored", color="#34c759")
    assert _find(cards, "Colored")["color"] == "#34c759"


def test_post_color_normalized_to_lowercase(client):
    """Color is normalized to lowercase regardless of input case."""
    cards = _add_card(client, "UpperCard", color="#FF9500")
    assert _find(cards, "UpperCard")["color"] == "#ff9500"


def test_patch_color_only_preserves_cut_off_day(client):
    """PATCH with only color does not reset cut_off_day."""
    _add_card(client, "Davivienda2", cut_off_day=12)
    cards = _patch_card(client, "Davivienda2", color="#007aff")
    card = _find(cards, "Davivienda2")
    assert card["color"] == "#007aff"
    assert card["cut_off_day"] == 12   # must be unchanged


def test_patch_cut_off_only_preserves_color(client):
    """PATCH with only cut_off_day does not reset color."""
    _add_card(client, "Nu", color="#af52de")
    cards = _patch_card(client, "Nu", cut_off_day=5)
    card = _find(cards, "Nu")
    assert card["cut_off_day"] == 5
    assert card["color"] == "#af52de"   # must be unchanged


def test_patch_color_null_clears_it(client):
    """PATCH color: null removes the stored color."""
    _add_card(client, "Bancolombia", color="#ff3b30")
    cards = _patch_card(client, "Bancolombia", color=None)
    assert _find(cards, "Bancolombia")["color"] is None


def test_rename_keeps_color(client):
    """PUT /cards/{name}/rename preserves the color on the row."""
    _add_card(client, "OldName", color="#5ac8fa")
    resp = client.put("/cards/OldName/rename", json={"new_name": "NewName"})
    assert resp.status_code == 200, resp.text
    assert _find(resp.json(), "NewName")["color"] == "#5ac8fa"


def test_get_cards_includes_color(client):
    """GET /cards includes the color field for all rows."""
    _add_card(client, "CardA", color="#ff2d55")
    _add_card(client, "CardB")
    resp = client.get("/cards")
    assert resp.status_code == 200
    cards = {c["name"]: c for c in resp.json()}
    assert "color" in cards["CardA"]
    assert cards["CardA"]["color"] == "#ff2d55"
    assert "color" in cards["CardB"]
    assert cards["CardB"]["color"] is None


@pytest.mark.parametrize("bad_color", ["red", "#fff", "#zzzzzz", "007aff", "#1234567", ""])
def test_invalid_color_on_post_returns_422(client, bad_color):
    """POST with an invalid color value returns 422."""
    resp = client.post("/cards", json={"name": "Bad", "color": bad_color})
    assert resp.status_code == 422, f"Expected 422 for color={bad_color!r}, got {resp.status_code}"


@pytest.mark.parametrize("bad_color", ["red", "#fff", "#zzzzzz", "007aff", "#1234567", ""])
def test_invalid_color_on_patch_returns_422(client, bad_color):
    """PATCH with an invalid color value returns 422."""
    _add_card(client, "ValidCard")
    resp = client.patch("/cards/ValidCard", json={"color": bad_color})
    assert resp.status_code == 422, f"Expected 422 for color={bad_color!r}, got {resp.status_code}"
