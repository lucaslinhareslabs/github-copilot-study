document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const confirmDialog = document.getElementById("confirm-dialog");
  const confirmParticipantName = document.getElementById("confirm-participant-name");
  const confirmActivityName = document.getElementById("confirm-activity-name");
  const confirmRemoveBtn = document.getElementById("confirm-remove-btn");
  const confirmCancelBtn = document.getElementById("confirm-cancel-btn");
  let pendingRemoval = null;

  function lockBackgroundScroll() {
    document.body.classList.add("dialog-open");
  }

  function unlockBackgroundScroll() {
    document.body.classList.remove("dialog-open");
  }

  confirmCancelBtn.addEventListener("click", () => {
    pendingRemoval = null;
    confirmDialog.close();
  });

  confirmDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    pendingRemoval = null;
    confirmDialog.close();
  });

  confirmDialog.addEventListener("close", () => {
    pendingRemoval = null;
    unlockBackgroundScroll();
  });

  confirmDialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      confirmDialog.close();
    }
  });

  confirmRemoveBtn.addEventListener("click", async () => {
    if (!pendingRemoval) {
      return;
    }

    const { activityName, email } = pendingRemoval;

    confirmRemoveBtn.disabled = true;
    confirmCancelBtn.disabled = true;
    confirmRemoveBtn.setAttribute("aria-busy", "true");
    const originalRemoveText = confirmRemoveBtn.textContent;
    confirmRemoveBtn.textContent = "Removing...";

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );

      const result = await response.json();
      confirmDialog.close();
      pendingRemoval = null;

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "Unable to remove participant";
        messageDiv.className = "error";
      }
    } catch (error) {
      messageDiv.textContent = "Failed to remove participant. Please try again.";
      messageDiv.className = "error";
      console.error("Error removing participant:", error);
    } finally {
      confirmRemoveBtn.disabled = false;
      confirmCancelBtn.disabled = false;
      confirmRemoveBtn.removeAttribute("aria-busy");
      confirmRemoveBtn.textContent = originalRemoveText;
    }

    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and previous options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsHtml = details.participants.length
          ? `<ul class="participants-list">${details.participants
              .map(
                (participant) => `
                <li>
                  <span>${participant}</span>
                  <button type="button" class="remove-participant-btn" data-activity="${name}" data-email="${participant}" aria-label="Remove ${participant}">×</button>
                </li>`
              )
              .join("")}
            </ul>`
          : `<p class="no-participants">No participants signed up yet.</p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p><strong>Participants:</strong></p>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        activityCard.querySelectorAll(".remove-participant-btn").forEach((button) => {
          button.addEventListener("click", () => {
            pendingRemoval = {
              activityName: button.dataset.activity,
              email: button.dataset.email,
            };
            confirmParticipantName.textContent = button.dataset.email;
            confirmActivityName.textContent = button.dataset.activity;
            confirmDialog.showModal();
            lockBackgroundScroll();
            confirmCancelBtn.focus();
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
