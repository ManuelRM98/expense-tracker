def test_set_and_get_config_value(client):
    put = client.put("/config/base_salary", json={"value": "5000000"})
    assert put.status_code == 200
    assert put.json() == {"key": "base_salary", "value": "5000000"}

    got = client.get("/config/base_salary")
    assert got.status_code == 200
    assert got.json()["value"] == "5000000"
