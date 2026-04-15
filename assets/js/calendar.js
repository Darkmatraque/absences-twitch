// Récupération de l'utilisateur courant
const currentUser = JSON.parse(localStorage.getItem("twitchUser"));
if (!currentUser) {
  // Si jamais on arrive ici sans user, on ne fait rien
  console.warn("Aucun utilisateur Twitch trouvé dans localStorage.");
}

// Génération des créneaux horaires
const calendar = document.getElementById("calendar");

for (let h = 0; h < 24; h++) {
  const slot = document.createElement("div");
  slot.classList.add("time-slot");
  slot.dataset.hour = h;
  slot.textContent = String(h).padStart(2, "0") + ":00";

  slot.addEventListener("click", () => toggleAbsence(slot));

  calendar.appendChild(slot);
}

// Marquer / dé-marquer une absence (POUR L'UTILISATEUR COURANT UNIQUEMENT)
async function toggleAbsence(slot) {
  if (!currentUser) return;

  const hour = parseInt(slot.dataset.hour, 10);
  const today = new Date().toISOString().slice(0, 10);

  // On regarde si CET utilisateur est déjà absent à CETTE heure
  const { data: existing, error: selectError } = await supabase
    .from("absences")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("hour", hour)
    .eq("date", today)
    .maybeSingle();

  if (selectError && selectError.code !== "PGRST116") {
    console.error("Erreur lors de la vérification d'absence :", selectError);
    return;
  }

  // Si une absence existe déjà pour cet utilisateur → on la supprime
  if (existing) {
    const { error: deleteError } = await supabase
      .from("absences")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      console.error("Erreur lors de la suppression d'absence :", deleteError);
      return;
    }

    // On remet juste l'affichage de base pour CET utilisateur
    slot.classList.remove("my-absence");
    refreshSlotDisplay(hour);
    return;
  }

  // Sinon → on ajoute une absence pour cet utilisateur
  const { error: insertError } = await supabase.from("absences").insert({
    user_id: currentUser.id,
    username: currentUser.display_name || currentUser.login,
    avatar: currentUser.profile_image_url,
    hour: hour,
    date: today
  });

  if (insertError) {
    console.error("Erreur lors de l'ajout d'absence :", insertError);
    return;
  }

  // On rafraîchit l'affichage de ce créneau
  await refreshSlotDisplay(hour);
}

// Rafraîchir l'affichage d'un créneau pour l'utilisateur courant
async function refreshSlotDisplay(hour) {
  const slot = document.querySelector(`.time-slot[data-hour="${hour}"]`);
  if (!slot) return;

  const today = new Date().toISOString().slice(0, 10);

  // On regarde si l'utilisateur courant est absent à cette heure
  const { data: existing, error } = await supabase
    .from("absences")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("hour", hour)
    .eq("date", today)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Erreur lors du refresh de créneau :", error);
    return;
  }

  // Si pas d'absence → affichage normal
  if (!existing) {
    slot.classList.remove("my-absence");
    slot.innerHTML = String(hour).padStart(2, "0") + ":00";
    return;
  }

  // Si absence → on affiche uniquement CET utilisateur
  slot.classList.add("my-absence");
  slot.innerHTML = `
    <div class="absence-block">
      <img src="${existing.avatar}" class="absence-avatar">
      <span>${existing.username} — Absent</span>
    </div>
  `;
}

// Charger les absences de l'utilisateur courant au démarrage
async function loadAbsences() {
  if (!currentUser) return;

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("absences")
    .select("*")
    .eq("date", today)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Erreur lors du chargement des absences :", error);
    return;
  }

  data.forEach(abs => {
    const slot = document.querySelector(`.time-slot[data-hour="${abs.hour}"]`);
    if (!slot) return;

    slot.classList.add("my-absence");
    slot.innerHTML = `
      <div class="absence-block">
        <img src="${abs.avatar}" class="absence-avatar">
        <span>${abs.username} — Absent</span>
      </div>
    `;
  });
}

loadAbsences();
