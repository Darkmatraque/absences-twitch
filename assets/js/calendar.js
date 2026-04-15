console.log("CALENDAR JS LOADED");

// --------------------------------------------------
//  UTILISATEUR CONNECTÉ
// --------------------------------------------------
const currentUser = JSON.parse(localStorage.getItem("twitchUser"));
if (!currentUser) {
  console.error("Aucun utilisateur trouvé dans localStorage.");
}

// --------------------------------------------------
//  OUTILS DATES (SEMAINE, LUNDI, ETC.)
// --------------------------------------------------
function formatDateLocal(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split("T")[0];
}

// Retourne le lundi de la semaine de la date donnée
function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = dimanche, 1 = lundi...
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return formatDateLocal(d);
}

// Ajoute X jours à une date YYYY-MM-DD
function addDays(dateString, days) {
  const d = new Date(dateString + "T00:00:00");
  d.setDate(d.getDate() + days);
  return formatDateLocal(d);
}

// Format "Lundi 15 avril"
function formatDateHuman(dateString) {
  const date = new Date(dateString + "T00:00:00");

  const jours = [
    "Dimanche", "Lundi", "Mardi", "Mercredi",
    "Jeudi", "Vendredi", "Samedi"
  ];

  const mois = [
    "janvier", "février", "mars", "avril",
    "mai", "juin", "juillet", "août",
    "septembre", "octobre", "novembre", "décembre"
  ];

  return `${jours[date.getDay()]} ${date.getDate()} ${mois[date.getMonth()]}`;
}

// --------------------------------------------------
//  SEMAINE COURANTE
// --------------------------------------------------
let currentWeekStart = getMonday(new Date());

function updateWeekDisplay() {
  const start = currentWeekStart;
  const end = addDays(start, 6);

  const label = document.getElementById("current-week");
  if (label) {
    label.textContent = `${formatDateHuman(start)} → ${formatDateHuman(end)}`;
  }

  // Mise à jour des en-têtes
  const dayHeaders = document.querySelectorAll(".day-header");
  const joursCourts = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  dayHeaders.forEach((el, index) => {
    const date = addDays(start, index);
    el.textContent = `${joursCourts[index]} ${formatDateHuman(date)}`;
  });
}

// --------------------------------------------------
//  NAVIGATION ENTRE SEMAINES
// --------------------------------------------------
document.getElementById("prev-week")?.addEventListener("click", () => {
  currentWeekStart = addDays(currentWeekStart, -7);
  updateWeekDisplay();
  generateCalendarGrid();
  loadAbsencesWeek();
});

document.getElementById("next-week")?.addEventListener("click", () => {
  currentWeekStart = addDays(currentWeekStart, 7);
  updateWeekDisplay();
  generateCalendarGrid();
  loadAbsencesWeek();
});

// --------------------------------------------------
//  GÉNÉRATION DE LA GRILLE HEBDOMADAIRE
// --------------------------------------------------
const calendar = document.getElementById("calendar");

function generateCalendarGrid() {
  calendar.innerHTML = "";

  for (let hour = 0; hour < 24; hour++) {
    // Colonne des heures
    const hourCell = document.createElement("div");
    hourCell.classList.add("hour-label");
    hourCell.textContent = `${String(hour).padStart(2, "0")}:00`;
    calendar.appendChild(hourCell);

    // 7 jours
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = addDays(currentWeekStart, dayIndex);

      const slot = document.createElement("div");
      slot.classList.add("day-slot");
      slot.dataset.date = date;
      slot.dataset.hour = hour;

      slot.addEventListener("click", () => toggleAbsence(date, hour));

      calendar.appendChild(slot);
    }
  }
}

// --------------------------------------------------
//  COULEUR PAR UTILISATEUR
// --------------------------------------------------
function getColorForUser(userId) {
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 75%, 60%)`;
}

// --------------------------------------------------
//  AJOUT / SUPPRESSION D'ABSENCE
// --------------------------------------------------
async function toggleAbsence(date, hour) {
  const { data: rows, error: selectError } = await db
    .from("absences")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("date", date)
    .eq("hour", hour);

  if (selectError) return console.error(selectError);

  // SUPPRESSION
  if (rows?.length > 0) {
    const { error } = await db.from("absences").delete().eq("id", rows[0].id);
    if (error) return console.error(error);
  }

  // AJOUT
  else {
    const { error } = await db.from("absences").insert({
      user_id: currentUser.id,
      username: currentUser.display_name || currentUser.login,
      avatar: currentUser.profile_image_url,
      hour,
      date
    });
    if (error) return console.error(error);
  }

  loadAbsencesWeek();
}

// --------------------------------------------------
//  CHARGEMENT DES ABSENCES DE LA SEMAINE
// --------------------------------------------------
async function loadAbsencesWeek() {
  document.querySelectorAll(".day-slot").forEach(slot => {
    slot.innerHTML = "";
  });

  const start = currentWeekStart;
  const end = addDays(start, 6);

  const { data, error } = await db
    .from("absences")
    .select("*")
    .gte("date", start)
    .lte("date", end);

  if (error) return console.error(error);
  if (!data) return;

  data.forEach(abs => {
    const slot = document.querySelector(
      `.day-slot[data-date="${abs.date}"][data-hour="${abs.hour}"]`
    );
    if (!slot) return;

    const color = getColorForUser(abs.user_id);

    const item = document.createElement("div");
    item.classList.add("absence-item");

    item.innerHTML = `
      <img src="${abs.avatar}" class="absence-avatar">
      <span>${abs.username}</span>
      <span class="absence-badge" style="background:${color}22; color:${color}; border:1px solid ${color};">
        ABSENT
      </span>
    `;

    if (String(abs.user_id) === String(currentUser.id)) {
      item.classList.add("me");
    }

    slot.appendChild(item);
  });
}

// --------------------------------------------------
//  INITIALISATION
// --------------------------------------------------
updateWeekDisplay();
generateCalendarGrid();
loadAbsencesWeek();
