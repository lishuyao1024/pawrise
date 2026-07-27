def test_health_check_returns_database_status(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.get_json() == {
        "success": True,
        "message": "PawRise API is running.",
        "data": {
            "service": "pawrise-backend",
            "database": "connected",
        },
    }
