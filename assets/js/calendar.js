// Récupération de l'utilisateur courant
const currentUser = JSON.parse(localStorage.getItem("twitchUser"));
if (!currentUser) {
  console.error("Aucun utilisateur trouvé.");
}

// Génération des créneaux horaires
const calendar = document.getElementById("calendar");

for (let h = 0; h < 24; h++) {
  const slot = document.createElement("div");
  slot.classList.add("time-slot");
  slot.dataset.hour = h;

  // Conteneur pour afficher plusieurs absents
  const list = document.createElement("div");
  list.classList.add("absence-list");

  const label = document.createElement("div");
  label.classList.add("hour-label");
  label.textContent = String(h).padStart(2, "0") + ":00";

  slot.appendChild(label);
  slot.appendChild(list);

  slot.addEventListener("click", () => toggleAbsence(slot));

  calendar.appendChild(slot);
}

// Ajouter / retirer une absence (POUR L'UTILISATEUR COURANT)
async function toggleAbsence(slot) {
  const hour = parseInt(slot.dataset.hour);
  const today = new Date().toISOString().slice(0, 10);

  // Vérifier si CET utilisateur est déjà absent à CETTE heure
  const { data: existing } = await supabase
    .from("absences")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("hour", hour)
    .eq("date", today)
    .maybeSingle();

  // Si déjà absent → supprimer UNIQUEMENT sa ligne
  if (existing) {
    await supabase.from("absences").delete().eq("id", existing.id);
    await refreshSlot(hour);
    return;
  }

  // Sinon → ajouter une absence
  await supabase.from("absences").insert({
    user_id: currentUser.id,
    username: currentUser.display_name || currentUser.login,
    avatar: currentUser.profile_image_url,
    hour: hour,
    date: today
  });

  await refreshSlot(hour);
}

// Rafraîchir l'affichage d'un créneau (montre TOUT LE MONDE)
async function refreshSlot(hour) {
  const slot = document.querySelector(`.time-slot[data-hour="${hour}"]`);
  const list = slot.querySelector(".absence-list");
  list.innerHTML = ""; // reset

  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("absences")
    .select("*")
    .eq("hour", hour)
    .eq("date", today);

  data.forEach(abs => {
    const item = document.createElement("div");
    item.classList.add("absence-item");

    item.innerHTML = `
      <img src="${abs.avatar}" class="absence-avatar">
      <span>${abs.username}</span>
    `;

    // On marque visuellement l'absence du user courant
    if (abs.user_id === currentUser.id) {
      item.classList.add("me");
    }

    list.appendChild(item);
  });
}

// Charger toutes les absences au démarrage
async function loadAbsences() {
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("absences")
    .select("*")
    .eq("date", today);

  data.forEach(abs => {
    const slot = document.querySelector(`.time-slot[data-hour="${abs.hour}"]`);
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
