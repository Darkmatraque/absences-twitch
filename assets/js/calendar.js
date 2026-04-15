console.log("CALENDAR JS LOADED");

// --- Récupération de l'utilisateur connecté ---
const currentUser = JSON.parse(localStorage.getItem("twitchUser"));
if (!currentUser) {
  console.error("Aucun utilisateur trouvé dans localStorage.");
}

// --- Date locale sans décalage ---
function formatDate(d) {
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

let currentDate = formatDate(new Date());

// --- Mise à jour de l'affichage de la date ---
function updateDateDisplay() {
  document.getElementById("current-date").textContent = currentDate;
}

// --- Navigation entre les jours ---
document.getElementById("prev-day").addEventListener("click", () => {
  const d = new Date(currentDate);
  d.setDate(d.getDate() - 1);
  currentDate = formatDate(d);
  updateDateDisplay();
  loadAbsences();
});

document.getElementById("next-day").addEventListener("click", () => {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + 1);
  currentDate = formatDate(d);
  updateDateDisplay();
  loadAbsences();
});

// --- Génération des créneaux horaires ---
const calendar = document.getElementById("calendar");

for (let h = 0; h < 24; h++) {
  const slot = document.createElement("div");
  slot.classList.add("time-slot");
  slot.dataset.hour = h;

  const label = document.createElement("div");
  label.classList.add("hour-label");
  label.textContent = String(h).padStart(2, "0") + ":00";

  const list = document.createElement("div");
  list.classList.add("absence-list");

  slot.appendChild(label);
  slot.appendChild(list);

  slot.addEventListener("click", () => toggleAbsence(h));

  calendar.appendChild(slot);
}

// --- Ajouter / retirer une absence ---
async function toggleAbsence(hour) {
  const { data: rows, error: selectError } = await db
    .from("absences")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("date", currentDate)
    .eq("hour", hour);

  console.log("SELECT rows:", rows);

  if (selectError) return console.error(selectError);

  if (rows.length > 0) {
    await db.from("absences").delete().eq("id", rows[0].id);
    console.log("Absence supprimée !");
  } else {
    await db.from("absences").insert({
      user_id: currentUser.id,
      username: currentUser.display_name || currentUser.login,
      avatar: currentUser.profile_image_url,
      hour: hour,
      date: currentDate
    });
    console.log("Absence ajoutée !");
  }

  loadAbsences();
}

// --- Charger les absences du jour ---
async function loadAbsences() {
  document.querySelectorAll(".absence-list").forEach(list => list.innerHTML = "");

  const { data, error } = await db
    .from("absences")
    .select("*")
    .eq("date", currentDate);

  if (error) return console.error(error);

  data.forEach(abs => {
    const slot = document.querySelector(`.time-slot[data-hour="${abs.hour}"]`);
    if (!slot) return;

    const list = slot.querySelector(".absence-list");

    const item = document.createElement("div");
    item.classList.add("absence-item");

    item.innerHTML = `
      <img src="${abs.avatar}" class="absence-avatar">
      <span>${abs.username}</span>
    `;

    if (String(abs.user_id) === String(currentUser.id)) {
      item.classList.add("me");
    }

    list.appendChild(item);
  });
}

updateDateDisplay();
loadAbsences();
