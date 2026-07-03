import os
import re
import requests
from dotenv import load_dotenv
from flask import Flask, request, jsonify 
from waitress import serve
from langdetect import detect, LangDetectException 

# ── Configuration ──────────────────────────────────────────────────────────
load_dotenv()

app = Flask(__name__)

PORT = int(os.environ.get("TRANSLATE_PORT", 5002))

# LibreTranslate — tourne sur port 5000
LIBRETRANSLATE_URL = os.environ.get("LIBRETRANSLATE_URL", "http://localhost:5000")
LIBRETRANSLATE_API_KEY = os.environ.get("LIBRETRANSLATE_API_KEY", "")

# DeepL — fallback optionnel
DEEPL_ENABLED = os.environ.get("DEEPL_ENABLED", "false").lower() == "true"
DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY", "")
DEEPL_URL = "https://api-free.deepl.com/v2/translate"

# Langues supportées en V1
LANGUES_SUPPORTEES = ["fr", "en"]

# ── Nettoyage du texte traduit ─────────────────────────────────────────────
# Corrige les espaces parasites autour des apostrophes
# identifiés lors des tests LibreTranslate : "l ' annexe" → "l'annexe"
def nettoyer_traduction(texte: str) -> str:
    if not texte:
        return ""

    # Espaces parasites autour des apostrophes
    texte = re.sub(r"\s+'\s+", "'", texte)

    # Espaces parasites autour des tirets
    texte = re.sub(r"\s+-\s+", "-", texte)

    # Espaces multiples
    texte = re.sub(r" {2,}", " ", texte)

    # Espaces avant ponctuation française
    texte = re.sub(r"\s+([.,;:!?»])", r"\1", texte)

    # Trim
    return texte.strip()

# ── Découpage en segments ─────────────────────────────────────────────────
# Découpe le texte par paragraphes pour de meilleurs résultats
def decouper_en_segments(texte: str) -> list[str]:
    # Découper par paragraphes (lignes vides)
    paragraphes = re.split(r"\n\s*\n", texte.strip())

    segments = []
    for para in paragraphes:
        para = para.strip()
        if para:
            segments.append(para)

    return segments if segments else [texte]

# ── Détection de langue ────────────────────────────────────────────────────
def detecter_langue(texte: str) -> str:
    try:
        if len(texte.strip()) < 10:
            return "inconnu"
        langue = detect(texte)
        return langue if langue in LANGUES_SUPPORTEES else langue
    except LangDetectException:
        return "inconnu"

# ── Traduction via LibreTranslate ──────────────────────────────────────────
def traduire_libretranslate(
    texte: str,
    source: str,
    cible: str
) -> dict:
    payload = {
        "q": texte,
        "source": source,
        "target": cible,
        "format": "text",
        "alternatives": 3,
        "api_key": LIBRETRANSLATE_API_KEY,
    }

    response = requests.post(
        f"{LIBRETRANSLATE_URL}/translate",
        json=payload,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()

    return {
        "texte": nettoyer_traduction(data.get("translatedText", "")),
        "alternatives": [
            nettoyer_traduction(alt)
            for alt in data.get("alternatives", [])
        ],
        "moteur": "libretranslate",
    }

# ── Traduction via DeepL (fallback) ───────────────────────────────────────
def traduire_deepl(texte: str, source: str, cible: str) -> dict:
    if not DEEPL_API_KEY:
        raise ValueError("DEEPL_API_KEY non configuré")

    # DeepL utilise des codes langue différents
    codes_deepl = {"fr": "FR", "en": "EN-GB"}
    source_deepl = codes_deepl.get(source, source.upper())
    cible_deepl = codes_deepl.get(cible, cible.upper())

    payload = {
        "auth_key": DEEPL_API_KEY,
        "text": texte,
        "source_lang": source_deepl,
        "target_lang": cible_deepl,
    }

    response = requests.post(
        DEEPL_URL,
        data=payload,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()

    texte_traduit = data["translations"][0]["text"]

    return {
        "texte": nettoyer_traduction(texte_traduit),
        "alternatives": [],
        "moteur": "deepl",
    }

# ── Traduction avec fallback automatique ───────────────────────────────────
def traduire(texte: str, source: str, cible: str, deepl_actif: bool = DEEPL_ENABLED) -> dict:
    # Essayer LibreTranslate en premier
    try:
        return traduire_libretranslate(texte, source, cible)
    except Exception as e:
        libretranslate_erreur = str(e)
        print(f"[translate] LibreTranslate échoué : {libretranslate_erreur}")

   # Fallback DeepL si activé (au niveau de la requête, sinon valeur par défaut du service)
    if deepl_actif:
        try:
            print("[translate] Bascule vers DeepL...")
            return traduire_deepl(texte, source, cible)
        except Exception as e:
            print(f"[translate] DeepL échoué : {e}")

    raise RuntimeError(
        f"Tous les moteurs ont échoué. LibreTranslate: {libretranslate_erreur}"
    )

# ── Résoudre deepl_actif depuis la requête, avec repli sur la config serveur ─
def resoudre_deepl_actif(data: dict) -> bool:
    valeur = data.get("deepl_actif")
    return DEEPL_ENABLED if valeur is None else bool(valeur)

# ── Route : POST /translate ────────────────────────────────────────────────
@app.route("/translate", methods=["POST"])
def translate():
    """
    Traduit un texte.
    Body JSON : { "texte": "...", "source": "fr", "cible": "en" }
    source peut être "auto" pour détection automatique.
    """
    data = request.get_json()

    if not data or "texte" not in data:
        return jsonify({"error": "Champ 'texte' requis."}), 400

    texte = data.get("texte", "").strip()
    source = data.get("source", "auto")
    cible = data.get("cible", "en")

    if not texte:
        return jsonify({"error": "Texte vide."}), 400

    # Validation des langues
    if cible not in LANGUES_SUPPORTEES:
        return jsonify({
            "error": f"Langue cible non supportée : {cible}",
            "langues_supportees": LANGUES_SUPPORTEES,
        }), 400

    # Détection automatique de la langue source
    if source == "auto":
        source = detecter_langue(texte)
        if source == "inconnu":
            source = "fr"  # défaut ANAC

    # Pas de traduction si source == cible
    if source == cible:
        return jsonify({
            "texte": texte,
            "alternatives": [],
            "moteur": "aucun",
            "source_detectee": source,
            "succes": True,
            "message": "Source et cible identiques — texte retourné sans traduction.",
        })

    deepl_actif = resoudre_deepl_actif(data)

    try:
        resultat = traduire(texte, source, cible, deepl_actif)
        return jsonify({
            **resultat,
            "source_detectee": source,
            "succes": True,
            "caracteres": len(texte),
        })
    except Exception as e:
        return jsonify({
            "error": str(e),
            "succes": False,
        }), 500

# ── Route : POST /translate/batch ─────────────────────────────────────────
@app.route("/translate/batch", methods=["POST"])
def translate_batch():
    """
    Traduit un texte long en le découpant par paragraphes.
    Body JSON : { "texte": "...", "source": "auto", "cible": "en" }
    Retourne les segments traduits + texte complet assemblé.
    """
    data = request.get_json()

    if not data or "texte" not in data:
        return jsonify({"error": "Champ 'texte' requis."}), 400

    texte = data.get("texte", "").strip()
    source = data.get("source", "auto")
    cible = data.get("cible", "en")

    if not texte:
        return jsonify({"error": "Texte vide."}), 400

    # Détection langue source
    if source == "auto":
        source = detecter_langue(texte)
        if source == "inconnu":
            source = "fr"

    if source == cible:
        return jsonify({
            "texte_complet": texte,
            "segments": [{"original": texte, "traduit": texte}],
            "moteur": "aucun",
            "source_detectee": source,
            "succes": True,
        })

    deepl_actif = resoudre_deepl_actif(data)

    # Découper en segments
    segments = decouper_en_segments(texte)
    segments_traduits = []
    moteur_utilise = "libretranslate"
    erreurs = []

    for i, segment in enumerate(segments):
        try:
            resultat = traduire(segment, source, cible, deepl_actif)
            segments_traduits.append({
                "original": segment,
                "traduit": resultat["texte"],
                "alternatives": resultat.get("alternatives", []),
            })
            moteur_utilise = resultat["moteur"]
        except Exception as e:
            erreurs.append(f"Segment {i+1}: {str(e)}")
            # Conserver le segment original en cas d'échec
            segments_traduits.append({
                "original": segment,
                "traduit": segment,
                "alternatives": [],
                "erreur": str(e),
            })

    # Assembler le texte complet traduit
    texte_complet = "\n\n".join(
        s["traduit"] for s in segments_traduits
    )

    return jsonify({
        "texte_complet": texte_complet,
        "segments": segments_traduits,
        "moteur": moteur_utilise,
        "source_detectee": source,
        "total_segments": len(segments),
        "succes": len(erreurs) == 0,
        "erreurs": erreurs if erreurs else None,
    })

# ── Route : POST /detect ───────────────────────────────────────────────────
@app.route("/detect", methods=["POST"])
def detect_language():
    """
    Détecte la langue d'un texte.
    Body JSON : { "texte": "..." }
    """
    data = request.get_json()

    if not data or "texte" not in data:
        return jsonify({"error": "Champ 'texte' requis."}), 400

    texte = data.get("texte", "").strip()
    if not texte:
        return jsonify({"error": "Texte vide."}), 400

    langue = detecter_langue(texte)

    return jsonify({
        "langue": langue,
        "supporte": langue in LANGUES_SUPPORTEES,
        "caracteres": len(texte),
    })

# ── Route : GET /health ────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    # Vérifier que LibreTranslate est accessible
    libretranslate_ok = False
    try:
        response = requests.get(
            f"{LIBRETRANSLATE_URL}/languages",
            timeout=3
        )
        libretranslate_ok = response.status_code == 200
    except Exception:
        pass

    return jsonify({
        "status": "ok",
        "service": "SICOT Translate Service",
        "port": PORT,
        "moteurs": {
            "libretranslate": {
                "url": LIBRETRANSLATE_URL,
                "disponible": libretranslate_ok,
            },
            "deepl": {
                "active": DEEPL_ENABLED,
                "configure": bool(DEEPL_API_KEY),
            },
        },
        "langues_supportees": LANGUES_SUPPORTEES,
    })

# ── Démarrage ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"✅ SICOT Translate Service démarré sur http://localhost:{PORT}")
    print(f"📋 LibreTranslate : {LIBRETRANSLATE_URL}")
    print(f"📋 DeepL fallback : {'activé' if DEEPL_ENABLED else 'désactivé'}")
    print(f"📋 Langues : {', '.join(LANGUES_SUPPORTEES)}")
    serve(app, host="127.0.0.1", port=PORT)