const calendar = document.getElementById("calendar");

// Génère les heures de 00:00 à 23:00
for (let h = 0; h < 24; h++) {
  const hourBlock = document.createElement("div");
  hourBlock.classList.add("hour");

  const formatted = h.toString().padStart(2, "0") + ":00";
  hourBlock.textContent = formatted;

  hourBlock.addEventListener("click", () => {
    hourBlock.classList.toggle("selected");
  });

  calendar.appendChild(hourBlock);
}
