# ============================================================
# API FastAPI - Détection de fraude
# ============================================================
# Ce fichier tourne côté SERVEUR (sur ta machine ou un serveur distant).
# C'est ici, et uniquement ici, que Python et le modèle ML sont utilisés.
# ============================================================

from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI(title="API Détection de Fraude")

# Sert les fichiers statiques (css, js) sous l'URL /static/...
# Sans cette ligne, le navigateur ne pourrait pas charger style.css et script.js
app.mount("/static", StaticFiles(directory="api/static"), name="static")

# ------------------------------------------------------------
# Chargement du modèle entraîné (une seule fois, au démarrage)
# ------------------------------------------------------------
modele = joblib.load("ML/modele_fraude_random_forest.pkl")
SEUIL = 0.530


# ------------------------------------------------------------
# Format attendu en entrée : une transaction
# ------------------------------------------------------------
# Pydantic vérifie automatiquement que chaque champ envoyé par le
# navigateur a le bon type (float, int...), sinon l'API renvoie une erreur
class Transaction(BaseModel):
    amount: float
    day: int
    hour: int
    type_CASH_OUT: int
    type_DEBIT: int
    type_PAYMENT: int
    type_TRANSFER: int
    isMerchantDest: int


# ------------------------------------------------------------
# Route appelée par script.js quand on clique sur "Analyser"
# ------------------------------------------------------------
@app.post("/predict")
def predict(transaction: Transaction):
    data = pd.DataFrame([transaction.model_dump()])

    # ----------------------------------------------------
    # predict_proba() : LE cœur du calcul
    # ----------------------------------------------------
    # Vient directement de la classe RandomForestClassifier (scikit-learn).
    # Random Forest = une centaine d'arbres de décision qui "votent"
    # chacun 0 (normal) ou 1 (fraude). predict_proba() ne renvoie pas
    # le vote final, mais la PROPORTION d'arbres qui ont voté "fraude".
    
    proba = modele.predict_proba(data)[0][1]

    # On applique notre seuil optimal (0.530) plutôt que le seuil
    # par défaut de predict() (0.5), pour la meilleure decision possible
    est_fraude = bool(proba >= SEUIL)

    return {
        "probabilite_fraude": round(float(proba), 4),
        "est_fraude": est_fraude,
        "seuil_utilise": SEUIL
    }


# ------------------------------------------------------------
# Route qui sert la page d'accueil (le formulaire)
# ------------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
def home():
    with open("api/static/index.html", "r", encoding="utf-8") as f:
        return f.read()