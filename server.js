// Rédaction Express — serveur backend
//
// Version "alternatives sans carte bancaire" :
// - Génération IA via Google Gemini (API gratuite, sans carte)
// - Paiement Mobile Money en mode SEMI-AUTOMATIQUE :
//   le client paie sur ton numéro personnel, entre le code de transaction,
//   toi tu confirmes en un clic depuis /admin.html, puis le document
//   est généré et livré automatiquement.

const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const TMONEY_NUMBER = process.env.TMONEY_NUMBER || "90 00 00 00";
const FLOOZ_NUMBER = process.env.FLOOZ_NUMBER || "70 00 00 00";

// Stockage en mémoire des commandes (simple pour démarrer ;
// redémarre à zéro si le serveur redémarre — voir README pour la suite)
const orders = {};

const SYSTEM_PROMPT = `Tu es un rédacteur professionnel togolais. Tu rédiges des documents
prêts à l'emploi en français, adaptés au contexte togolais/ouest-africain
(formules de politesse locales, conventions professionnelles en vigueur
au Togo).

Règles :
- Utilise un français correct, soigné, sans anglicisme inutile
- Adapte la longueur au type de document demandé (ne rallonge pas artificiellement)
- N'invente aucune information non fournie par le client — si une info manque,
  laisse un espace clair du type [À COMPLÉTER : ...] plutôt que d'inventer
- Respecte le ton demandé par le client
- Structure toujours avec un formatage clair
- Génère uniquement le document final, sans commentaire ni explication avant ou après`;

async function generateWithGemini(docType, answers) {
  if (!GEMINI_API_KEY) {
    throw new Error("Clé API Gemini non configurée sur le serveur (voir README.md)");
  }

  const answersText = Object.entries(answers)
    .map(([label, value]) => `${label} : ${value || "(non précisé)"}`)
    .join("\n");

  const userPrompt = `Type de document demandé : ${docType}\nInformations fournies par le client :\n${answersText}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Erreur API Gemini:", errText);
    throw new Error("Échec de la génération");
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n") || "";
  if (!text) throw new Error("Réponse vide de l'IA");
  return text;
}

// ─── Côté client ─────────────────────────────────────────────

// Le client soumet sa commande + son code de transaction Mobile Money
app.post("/api/order", (req, res) => {
  const { docType, answers, payMode, transactionCode, phone } = req.body;
  if (!docType || !answers || !payMode || !transactionCode) {
    return res.status(400).json({ error: "Requête incomplète" });
  }

  const id = crypto.randomBytes(6).toString("hex");
  orders[id] = {
    id,
    docType,
    answers,
    payMode,
    transactionCode,
    phone: phone || "",
    status: "pending", // pending -> confirmed -> done (ou "error")
    text: null,
    createdAt: new Date().toISOString()
  };

  res.json({ orderId: id, payTo: payMode === "tmoney" ? TMONEY_NUMBER : FLOOZ_NUMBER });
});

// Le client interroge le statut de sa commande (polling)
app.get("/api/order/:id", (req, res) => {
  const order = orders[req.params.id];
  if (!order) return res.status(404).json({ error: "Commande introuvable" });
  res.json({ status: order.status, text: order.text });
});

// ─── Côté admin (toi) ────────────────────────────────────────

function checkAdmin(req, res) {
  const pw = req.query.password || req.headers["x-admin-password"];
  if (pw !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Mot de passe admin incorrect" });
    return false;
  }
  return true;
}

// Liste des commandes en attente de confirmation
app.get("/api/orders", (req, res) => {
  if (!checkAdmin(req, res)) return;
  const pending = Object.values(orders)
    .filter(o => o.status === "pending")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json({ orders: pending });
});

// Toi tu confirmes avoir reçu le paiement → génération automatique + livraison
app.post("/api/order/:id/confirm", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  const order = orders[req.params.id];
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  try {
    order.status = "confirmed";
    const text = await generateWithGemini(order.docType, order.answers);
    order.text = text;
    order.status = "done";
    res.json({ success: true });
  } catch (err) {
    order.status = "error";
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Rédaction Express en ligne sur le port ${PORT}`);
});
