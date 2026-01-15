# SearchWithEmbeddings

Système de recherche documentaire intelligente utilisant Milvus pour la recherche vectorielle sémantique.

## 🚀 Fonctionnalités

- **Recherche sémantique** : Trouve des documents par le sens, pas seulement par mots-clés
- **Recherche hybride** : Combine sémantique et recherche par mots-clés
- **OCR intégré** : Extraction de texte des PDFs scannés (Tesseract)
- **Multilingue** : Support français et anglais natif
- **RBAC** : Contrôle d'accès basé sur les divisions
- **Prévisualisation** : Affichage des PDFs avec surlignage des termes recherchés

## 📋 Prérequis

- Docker et Docker Compose
- 8 Go RAM minimum (16 Go recommandés)
- 20 Go d'espace disque

## 🛠️ Installation

### 1. Cloner et configurer

```bash
cd SearchWithEmbeddings

# Copier le fichier d'environnement
cp .env.example .env
```

### 2. Créer le dossier documents

```bash
mkdir -p documents
# Placez vos PDFs dans ce dossier, organisés par division :
# documents/DSI/rapport.pdf
# documents/DRH/procedure.pdf
```

### 3. Lancer les services

```bash
# Démarrer tous les services
docker compose up -d

# Vérifier le statut
docker compose ps

# Voir les logs
docker compose logs -f
```

### 4. Initialiser Milvus

```bash
# Attendre que Milvus soit prêt (30s environ)
docker compose exec indexer python /app/scripts/init-milvus.py
```

### 5. Indexer les documents

```bash
# Indexer tous les documents du dossier
docker compose exec indexer python /app/scripts/reindex-all.py
```

## 🌐 Accès

- **Application** : http://localhost:3000
- **API Indexer** : http://localhost:8000
- **Documentation API** : http://localhost:8000/docs

## 📁 Structure du projet

```
SearchWithEmbeddings/
├── app/                    # Application Next.js
│   ├── src/
│   │   ├── app/           # Pages et routes
│   │   └── components/    # Composants React
│   ├── prisma/            # Schéma base de données
│   └── Dockerfile
├── indexer/               # Service Python d'indexation
│   ├── services/          # Services métier
│   ├── main.py           # API FastAPI
│   └── Dockerfile
├── scripts/               # Scripts utilitaires
│   ├── init-milvus.py
│   └── reindex-all.py
├── documents/             # Dossier des documents à indexer
└── docker-compose.yml
```

## 🔧 Configuration

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `MILVUS_HOST` | Hôte Milvus | `milvus` |
| `MILVUS_PORT` | Port Milvus | `19530` |
| `EMBEDDING_MODEL` | Modèle d'embeddings | `paraphrase-multilingual-MiniLM-L12-v2` |
| `OCR_LANGUAGES` | Langues OCR | `fra+eng` |
| `DOCUMENTS_DIR` | Dossier documents | `/app/documents` |

## 🔍 API Endpoints

### Recherche
```bash
POST /api/search
{
  "query": "budget 2024",
  "limit": 50,
  "search_mode": "hybrid",  # hybrid, semantic, keyword
  "division": "DSI"         # optionnel
}
```

### Indexation
```bash
# Indexer un fichier
POST /index/file
{ "file_path": "/app/documents/DSI/rapport.pdf" }

# Indexer un dossier
POST /index/directory
{ "directory_path": "/app/documents/DSI" }
```

## 🐳 Commandes Docker

```bash
# Démarrer
docker compose up -d

# Arrêter
docker compose down

# Voir les logs
docker compose logs -f indexer

# Reconstruire après modifications
docker compose build --no-cache
docker compose up -d

# Nettoyer tout (⚠️ supprime les données)
docker compose down -v
```

## 📊 Monitoring

Vérifier l'état des services :

```bash
# Statut de l'indexer
curl http://localhost:8000/status

# Nombre de documents indexés
curl http://localhost:8000/stats
```

## 🔐 Sécurité

- Authentification via NextAuth.js
- Contrôle d'accès par division
- Toutes les connexions internes via réseau Docker
- Milvus et PostgreSQL non exposés publiquement

