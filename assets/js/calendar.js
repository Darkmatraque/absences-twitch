// Génération des créneaux horaires
const calendar = document.getElementById("calendar");

for (let h = 0; h < 24; h++) {
  const slot = document.createElement("div");
  slot.classList.add("time-slot");
  slot.dataset.hour = h;
  slot.textContent = (h < 10 ? "0" : "") + h + ":00";

  slot.addEventListener("click", () => toggleAbsence(slot));

  calendar.appendChild(slot);
}

// Fonction pour marquer / dé-marquer une absence
function toggleAbsence(slot) {
  const user = JSON.parse(localStorage.getItem("twitchUser"));
  if (!user) return;

  // Si déjà absent → on enlève
  if (slot.classList.contains("absent")) {
    slot.classList.remove("absent");
    slot.innerHTML = slot.dataset.hour.padStart(2, "0") + ":00";
    return;
  }

  // Sinon → on marque absent
  slot.classList.add("absent");
  slot.innerHTML = `
    <div class="absence-block">
      <img src="${user.profile_image_url}" class="absence-avatar">
      <span>${user.display_name || user.login} — Absent</span>
    </div>
  `;
}
