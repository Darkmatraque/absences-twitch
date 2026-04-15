console.log("CALENDAR JS LOADED");

// --------------------------------------------------
//  UTILISATEUR CONNECTÉ
// --------------------------------------------------
const currentUser = JSON.parse(localStorage.getItem("twitchUser"));
if (!currentUser) {
  console.error("Aucun utilisateur trouvé dans localStorage.");
}

// --------------------------------------------------
//  GESTION DE LA DATE COURANTE
// --------------------------------------------------
function formatDateLocal(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

let currentDate = formatDateLocal(new Date());

// --------------------------------------------------
//  AFFICHAGE DE LA DATE
// --------------------------------------------------
function updateDateDisplay() {
  const dateEl = document.getElementById("current-date");
  if (dateEl) dateEl.textContent = currentDate;
}

// --------------------------------------------------
//  NAVIGATION ENTRE LES JOURS
// --------------------------------------------------
document.getElementById("prev-day")?.addEventListener("click", () => {
  const d = new Date(currentDate);
  d.setDate(d.getDate() - 1);
  currentDate = formatDateLocal(d);
  updateDateDisplay();
  loadAbsences();
});

document.getElementById("next-day")?.addEventListener("click", () => {
  const d = new Date(currentDate);
  d.setDate(d.getDate() + 1);
  currentDate = formatDateLocal(d);
  updateDateDisplay();
  loadAbsences();
});

// --------------------------------------------------
//  GÉNÉRATION DU CALENDRIER (24H)
// --------------------------------------------------
const calendar = document.getElementById("calendar");

function generateCalendar() {
  calendar.innerHTML = "";

  for (let h = 0; h < 24; h++) {
    const slot = document.createElement("div");
    slot.classList.add("time-slot");
    slot.dataset.hour = h;

    const label = document.createElement("div");
    label.classList.add("hour-label");
    label.textContent = `${String(h).padStart(2, "0")}:00`;

    const list = document.createElement("div");
    list.classList.add("absence-list");

    slot.appendChild(label);
    slot.appendChild(list);

    slot.addEventListener("click", () => toggleAbsence(h));

    calendar.appendChild(slot);
  }
}

// --------------------------------------------------
//  AJOUT / SUPPRESSION D'UNE ABSENCE
// --------------------------------------------------
async function toggleAbsence(hour) {
  const { data: rows, error: selectError } = await db
    .from("absences")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("date", currentDate)
    .eq("hour", hour);

  if (selectError) {
    console.error("Erreur SELECT :", selectError);
    return;
  }

  // --- SUPPRESSION ---
  if (rows.length > 0) {
    const { error: deleteError } = await db
      .from("absences")
      .delete()
      .eq("id", rows[0].id);

    if (deleteError) {
      console.error("Erreur DELETE :", deleteError);
      return;
    }

    console.log("Absence supprimée !");
  }

  // --- AJOUT ---
  else {
    const { error: insertError } = await db.from("absences").insert({
      user_id: currentUser.id,
      username: currentUser.display_name || currentUser.login,
      avatar: currentUser.profile_image_url,
      hour: hour,
      date: currentDate
    });

    if (insertError) {
      console.error("Erreur INSERT :", insertError);
      return;
    }

    console.log("Absence ajoutée !");
  }

  loadAbsences();
}

// --------------------------------------------------
//  CHARGEMENT DES ABSENCES DU JOUR
// --------------------------------------------------
async function loadAbsences() {
  document.querySelectorAll(".absence-list").forEach(list => {
    list.innerHTML = "";
  });

  const { data, error } = await db
    .from("absences")
    .select("*")
    .eq("date", currentDate);

  if (error) {
    console.error("Erreur loadAbsences:", error);
    return;
  }

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

// --------------------------------------------------
//  INITIALISATION
// --------------------------------------------------
generateCalendar();
updateDateDisplay();
loadAbsences();
