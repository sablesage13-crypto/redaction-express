# Rédaction Express — Guide de mise en ligne (v2, sans carte bancaire)

Cette version utilise uniquement des outils **gratuits, sans carte bancaire** :
- **Google Gemini** pour la génération IA (au lieu de Claude/Anthropic)
- **Render.com** pour l'hébergement
- Un mode de paiement **semi-automatique** (ton numéro personnel Mobile Money + confirmation en un clic depuis ton téléphone) en attendant ton compte marchand

Tout le code a été testé de bout en bout et fonctionne (création de commande, protection par mot de passe admin, gestion des erreurs).

## Comment ça marche pour le client
1. Il ouvre ton lien, choisit un document, remplit le formulaire
2. Il choisit TMoney ou Flooz → le site lui affiche ton numéro personnel
3. Il paie, reçoit un code de transaction par SMS, le colle dans le formulaire
4. Sa commande part en attente

## Comment ça marche pour toi
1. Tu reçois le paiement sur ton téléphone (notification normale de ton opérateur)
2. Tu ouvres `tonsite.com/admin.html` sur ton téléphone, tu entres ton mot de passe admin
3. Tu vois la commande en attente avec le code de transaction — tu vérifies qu'il correspond au SMS reçu
4. Tu cliques "Confirmer" → le document est généré et livré automatiquement au client, sans autre action de ta part

C'est "semi-automatique" : la seule étape manuelle est ta confirmation (quelques secondes), tout le reste (génération, mise en forme, livraison) est automatique.

## Les 3 comptes gratuits à créer toi-même (aucun ne demande de carte)

### 1. Clé API Google Gemini
- Aller sur aistudio.google.com
- Se connecter avec un compte Google
- Section "Get API key" → créer une clé
- C'est gratuit, aucune carte demandée

### 2. Hébergement Render.com
- Créer un compte sur render.com (email ou GitHub)
- Créer un "Web Service" à partir de ce projet
- Dans les "Environment Variables", ajouter :
  - `GEMINI_API_KEY` → ta clé de l'étape 1
  - `ADMIN_PASSWORD` → un mot de passe que toi seul connais
  - `TMONEY_NUMBER` → ton numéro TMoney personnel
  - `FLOOZ_NUMBER` → ton numéro Flooz personnel
- Render te donne un lien du type `https://redaction-express.onrender.com`

### 3. Partager le lien
- Le lien principal (`.../index.html` ou juste le lien de base) → à partager avec tes clients
- Le lien admin (`.../admin.html`) → gardé pour toi seul, jamais partagé

## Migration future vers l'automatisation complète
Quand tu obtiendras ton compte marchand TMoney/Flooz, on remplacera la confirmation manuelle dans `admin.html` par un vrai webhook automatique — le code est structuré pour que ce changement soit simple (une seule fonction à modifier dans `server.js`).

## Lancer en local pour tester
```
npm install
GEMINI_API_KEY=ta_cle ADMIN_PASSWORD=test123 npm start
```
Ouvrir `http://localhost:3000` (client) et `http://localhost:3000/admin.html` (toi).

## Structure du projet
```
redaction-express/
├── public/
│   ├── index.html      → le site que voit le client
│   └── admin.html       → ta page de confirmation des paiements
├── server.js             → le serveur (Gemini + gestion des commandes)
├── package.json
└── README.md
```
