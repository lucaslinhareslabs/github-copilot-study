import copy
from fastapi.testclient import TestClient
from src.app import app, activities

# Original activities data for resetting
ORIGINAL_ACTIVITIES = copy.deepcopy(activities)


def reset_activities():
    """Reset the activities dictionary to its original state."""
    activities.clear()
    activities.update(ORIGINAL_ACTIVITIES)


def test_get_activities():
    """Test GET /activities returns all activities."""
    # Arrange
    reset_activities()
    client = TestClient(app)

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert "Programming Class" in data
    # Check structure of one activity
    chess_club = data["Chess Club"]
    assert "description" in chess_club
    assert "schedule" in chess_club
    assert "max_participants" in chess_club
    assert "participants" in chess_club
    assert isinstance(chess_club["participants"], list)


def test_signup_for_activity_success():
    """Test successful signup for an activity."""
    # Arrange
    reset_activities()
    client = TestClient(app)
    activity_name = "Chess Club"
    email = "newstudent@mergington.edu"

    # Act
    response = client.post(f"/activities/{activity_name}/signup", params={"email": email})

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert email in data["message"]
    assert activity_name in data["message"]
    # Check that participant was added
    assert email in activities[activity_name]["participants"]


def test_signup_for_activity_not_found():
    """Test signup for a non-existent activity."""
    # Arrange
    reset_activities()
    client = TestClient(app)
    activity_name = "NonExistent Activity"
    email = "student@mergington.edu"

    # Act
    response = client.post(f"/activities/{activity_name}/signup", params={"email": email})

    # Assert
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "Activity not found" in data["detail"]


def test_signup_for_activity_already_signed_up():
    """Test signup when student is already signed up."""
    # Arrange
    reset_activities()
    client = TestClient(app)
    activity_name = "Chess Club"
    email = "michael@mergington.edu"  # Already in participants

    # Act
    response = client.post(f"/activities/{activity_name}/signup", params={"email": email})

    # Assert
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data
    assert "Student already signed up for this activity" in data["detail"]


def test_remove_participant_success():
    """Test successful removal of a participant."""
    # Arrange
    reset_activities()
    client = TestClient(app)
    activity_name = "Chess Club"
    email = "michael@mergington.edu"  # Already in participants

    # Act
    response = client.delete(f"/activities/{activity_name}/participants", params={"email": email})

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert email in data["message"]
    assert activity_name in data["message"]
    # Check that participant was removed
    assert email not in activities[activity_name]["participants"]


def test_remove_participant_activity_not_found():
    """Test removal from a non-existent activity."""
    # Arrange
    reset_activities()
    client = TestClient(app)
    activity_name = "NonExistent Activity"
    email = "student@mergington.edu"

    # Act
    response = client.delete(f"/activities/{activity_name}/participants", params={"email": email})

    # Assert
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "Activity not found" in data["detail"]


def test_remove_participant_not_found():
    """Test removal of a participant not in the activity."""
    # Arrange
    reset_activities()
    client = TestClient(app)
    activity_name = "Chess Club"
    email = "notparticipant@mergington.edu"

    # Act
    response = client.delete(f"/activities/{activity_name}/participants", params={"email": email})

    # Assert
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
    assert "Participant not found in activity" in data["detail"]


def test_root_redirect():
    """Test GET / redirects to /static/index.html."""
    # Arrange
    client = TestClient(app)

    # Act
    response = client.get("/", follow_redirects=False)  # Don't follow redirect

    # Assert
    assert response.status_code == 307  # Temporary redirect
    assert response.headers["location"] == "/static/index.html"