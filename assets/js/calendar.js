// Récupération de l'utilisateur courant
const currentUser = JSON.parse(localStorage.getItem("twitchUser"));
if (!currentUser) {
  console.error("Aucun utilisateur trouvé dans localStorage (twitchUser).");
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
  if (!currentUser) return;

  const today = new Date().toISOString().slice(0, 10);

  // Est-ce que CET utilisateur est déjà absent à CETTE heure ?
  const { data: existing, error: selectError } = await supabase
    .from("absences")
    .select("*")
    .eq("user_id", currentUser.id)
    .eq("hour", hour)
    .eq("date", today)
    .maybeSingle();

  if (selectError && selectError.code !== "PGRST116") {
    console.error("Erreur select:", selectError);
    return;
  }

  // Si déjà absent → on supprime SA ligne
  if (existing) {
    const { error: deleteError } = await supabase
      .from("absences")
      .delete()
      .eq("id", existing.id);

    if (deleteError) {
      console.error("Erreur delete:", deleteError);
      return;
    }
  } else {
    // Sinon → on ajoute
    const { error: insertError } = await supabase.from("absences").insert({
      user_id: currentUser.id,
      username: currentUser.display_name || currentUser.login,
      avatar: currentUser.profile_image_url,
      hour: hour,
      date: today
    });

    if (insertError) {
      console.error("Erreur insert:", insertError);
      return;
    }
  }

  // On recharge tout l'affichage après chaque action
  await loadAbsences();
}

// Recharge toutes les absences du jour
async function loadAbsences() {
  const today = new Date().toISOString().slice(0, 10);

  // Reset visuel
  document.querySelectorAll(".absence-list").forEach(list => {
    list.innerHTML = "";
  });

  const { data, error } = await supabase
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
