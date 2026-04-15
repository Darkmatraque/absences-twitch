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

// Marquer / dé-marquer une absence
async function toggleAbsence(slot) {
  const user = JSON.parse(localStorage.getItem("twitchUser"));
  if (!user) return;

  const hour = parseInt(slot.dataset.hour);
  const today = new Date().toISOString().slice(0, 10);

  // Si déjà absent → supprimer dans Supabase
  if (slot.classList.contains("absent")) {
    slot.classList.remove("absent");
    slot.innerHTML = slot.dataset.hour.padStart(2, "0") + ":00";

    await supabase
      .from("absences")
      .delete()
      .eq("user_id", user.id)
      .eq("hour", hour)
      .eq("date", today);

    return;
  }

  // Sinon → ajouter dans Supabase
  slot.classList.add("absent");
  slot.innerHTML = `
    <div class="absence-block">
      <img src="${user.profile_image_url}" class="absence-avatar">
      <span>${user.display_name || user.login} — Absent</span>
    </div>
  `;

  await supabase.from("absences").insert({
    user_id: user.id,
    username: user.display_name || user.login,
    avatar: user.profile_image_url,
    hour: hour,
    date: today
  });
}

// Charger les absences au démarrage
async function loadAbsences() {
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("absences")
    .select("*")
    .eq("date", today);

  data.forEach(abs => {
    const slot = document.querySelector(`.time-slot[data-hour="${abs.hour}"]`);
    if (!slot) return;

    slot.classList.add("absent");
    slot.innerHTML = `
      <div class="absence-block">
        <img src="${abs.avatar}" class="absence-avatar">
        <span>${abs.username} — Absent</span>
      </div>
    `;
  });
}

loadAbsences();
