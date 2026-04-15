console.log("CALENDAR JS LOADED");

// --- Récupération de l'utilisateur connecté ---
const currentUser = JSON.parse(localStorage.getItem("twitchUser"));
if (!currentUser) {
  console.error("Aucun utilisateur trouvé dans localStorage.");
}

// --- Format date propre : YYYY-MM-DD ---
function getToday() {
  return new Date().toISOString().split("T")[0];
}

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

// --- Fonction pour ajouter / retirer une absence ---
async function toggleAbsence(hour) {
  const today = getToday();

  // Vérifier si l'absence existe déjà
  const { data: rows, error: selectError } = await db
    .from("absences")
    .select("id")
    .eq("user_id", currentUser.id)   // 🔥 ID Twitch correct
    .eq("date", today)
    .eq("hour", hour);

  if (selectError) {
    console.error("Erreur SELECT :", selectError);
    return;
  }

  // --- Si l'absence existe → supprimer ---
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

  // --- Sinon → ajouter ---
  else {
    const { error: insertError } = await db.from("absences").insert({
      user_id: currentUser.id,
      username: currentUser.display_name || currentUser.login,
      avatar: currentUser.profile_image_url,
      hour: hour,
      date: today
    });

    if (insertError) {
      console.error("Erreur INSERT :", insertError);
      return;
    }

    console.log("Absence ajoutée !");
  }

  // Recharger l'affichage
  await loadAbsences();
}

// --- Fonction pour charger toutes les absences du jour ---
async function loadAbsences() {
  const today = getToday();

  // Reset visuel
  document.querySelectorAll(".absence-list").forEach(list => {
    list.innerHTML = "";
  });

  const { data, error } = await db
    .from("absences")
    .select("*")
    .eq("date", today);

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

    if (abs.user_id === currentUser.id) {
      item.classList.add("me");
    }

    list.appendChild(item);
  });
}

loadAbsences();
