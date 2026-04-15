// Récupération de l'utilisateur courant
const currentUser = JSON.parse(localStorage.getItem("twitchUser"));
if (!currentUser) {
  console.error("Aucun utilisateur trouvé dans localStorage.");
}

// Génération des créneaux horaires
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

// Clique sur un créneau
async function toggleAbsence(hour) {
  const today = new Date().toLocaleDateString("fr-CA");


  // On récupère TOUTES les absences de CET utilisateur à CETTE heure
  const { data: rows, error: selectError } = await db
    .from("absences")
    .select("id")
    .eq("user_id", currentUser.id)
    .eq("hour", hour)
    .eq("date", today);

  if (selectError) {
    console.error("Erreur SELECT :", selectError);
    return;
  }

  // Si une ligne existe → on supprime
  if (rows.length > 0) {
    const { error: deleteError } = await db
      .from("absences")
      .delete()
      .eq("id", rows[0].id);

    if (deleteError) {
      console.error("Erreur DELETE :", deleteError);
      return;
    }
  } else {
    // Sinon → on ajoute
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
  }

  // On recharge tout l'affichage
  await loadAbsences();
}

// Recharge toutes les absences du jour
async function loadAbsences() {
  const today = new Date().toISOString().slice(0, 10);

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
