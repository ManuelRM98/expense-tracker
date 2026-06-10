SAVING = {
    "date": "2026-05-15",
    "desc": "Monthly investment",
    "category": "Investment",
    "price": 300000,
    "card_pay": "No",
}


def test_create_and_list_saving_by_month(client):
    created = client.post("/savings", json=SAVING)
    assert created.status_code == 201
    body = created.json()
    assert body["id"]
    assert body["price"] == 300000

    listed = client.get("/savings", params={"month": "2026-05"})
    assert listed.status_code == 200
    assert [s["id"] for s in listed.json()] == [body["id"]]
