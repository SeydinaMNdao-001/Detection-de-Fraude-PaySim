

// (route /predict dans main.py), et afficher la réponse reçue.
// ============================================================

// Valeurs actuellement sélectionnées dans les boutons toggle
let selectedType = "TRANSFER";
let selectedMerchant = "0";

// --- Gestion du choix du type de transaction (5 boutons) ---
document.querySelectorAll("#typeToggle button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#typeToggle button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedType = btn.dataset.type;
  });
});

// --- Gestion du choix "Client particulier" vs "Marchand" ---
document.querySelectorAll("#merchantToggle button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#merchantToggle button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedMerchant = btn.dataset.val;
  });
});




// --- Fonction appelée au clic sur "Analyser la transaction" ---
async function predire() {
  const submitBtn = document.getElementById("submitBtn");
  const resultPanel = document.getElementById("resultPanel");

  submitBtn.disabled = true;
  submitBtn.textContent = "Analyse en cours...";

  // On reconstruit les colonnes one-hot (type_CASH_OUT, type_DEBIT...)
  // à partir du bouton sélectionné -> même format que X_train du modèle
  const payload = {
    amount: parseFloat(document.getElementById("amount").value) || 0,
    day: parseInt(document.getElementById("day").value) || 1,
    hour: parseInt(document.getElementById("hour").value) || 0,
    type_CASH_OUT: selectedType === "CASH_OUT" ? 1 : 0,
    type_DEBIT: selectedType === "DEBIT" ? 1 : 0,
    type_PAYMENT: selectedType === "PAYMENT" ? 1 : 0,
    type_TRANSFER: selectedType === "TRANSFER" ? 1 : 0,
    isMerchantDest: parseInt(selectedMerchant)
  };







  try {
    // fetch() envoie le formulaire au serveur Python (route /predict de main.py)
    // C'est LA seule ligne qui communique avec le modèle ML -
    // le calcul lui-même (predict_proba) se fait entièrement côté serveur
    const reponse = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await reponse.json();  // { probabilite_fraude, est_fraude, seuil_utilise }
    afficherResultat(data);
  } catch (e) {
    resultPanel.innerHTML = `<div class="placeholder"><span class="icon">⚠</span>Impossible de contacter l'API</div>`;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Analyser la transaction";
  }
}

function afficherResultat(data) {
  const proba = data.probabilite_fraude;
  const pct = (proba * 100).toFixed(1);
  const estFraude = data.est_fraude;

  const color = estFraude ? "var(--danger)" : "var(--safe)";
  const circumference = 2 * Math.PI * 80;
  const offset = circumference * (1 - proba);

  const resultPanel = document.getElementById("resultPanel");
  resultPanel.innerHTML = `
    <div class="gauge-wrap">
      <svg width="190" height="190" viewBox="0 0 190 190">
        <circle class="gauge-bg" cx="95" cy="95" r="80"></circle>
        <circle class="gauge-fg" cx="95" cy="95" r="80"
          stroke="${color}"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${circumference}"
        ></circle>
      </svg>
      <div class="gauge-center">
        <div class="gauge-value" style="color:${color}">${pct}%</div>
        <div class="gauge-sub">probabilité</div>
      </div>
    </div>
    <div class="verdict ${estFraude ? 'danger' : 'safe'}">
      ${estFraude ? "⚠ TRANSACTION SUSPECTE" : "✓ TRANSACTION NORMALE"}
    </div>
    <div class="verdict-detail">
      ${estFraude
        ? "Cette transaction dépasse le seuil de décision et est signalée pour vérification."
        : "Cette transaction est en dessous du seuil de risque défini."}
    </div>
  `;

  // Déclenche l'animation de la jauge après le rendu
  requestAnimationFrame(() => {
    const fg = resultPanel.querySelector(".gauge-fg");
    fg.style.strokeDashoffset = offset;
  });
}