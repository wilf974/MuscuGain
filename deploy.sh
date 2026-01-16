#!/bin/bash

# Script de déploiement pour MuscuGain sur VPS Docker (intégration avec reverse proxy existant)

set -e

echo "🚀 Déploiement de MuscuGain en Docker"
echo "====================================="

# Vérifier que le fichier MuscuGain.html existe
if [ ! -f "MuscuGain.html" ]; then
    echo "❌ Erreur: MuscuGain.html non trouvé!"
    exit 1
fi

# Arrêter le conteneur existant si nécessaire
echo "⏹️  Arrêt des services existants (s'ils existent)..."
docker-compose down --remove-orphans 2>/dev/null || true

# Attendre un peu après l'arrêt
sleep 2

# Construire l'image Docker
echo "🔨 Construction de l'image Docker MuscuGain..."
docker-compose build

# Démarrer l'application MuscuGain
echo "🚀 Démarrage de l'application MuscuGain..."
docker-compose up -d muscugain

# Vérifier le status
sleep 3
echo ""
echo "📊 État des services:"
docker-compose ps

echo ""
echo "✅ Déploiement terminé avec succès!"
echo "====================================="
echo "📌 Application interne: http://127.0.0.1:8080"
echo "🌐 Application publique: https://muscugain.woutils.com"
echo ""
echo "📝 Configuration du reverse proxy existant:"
echo "Ajouter cette configuration au reverse proxy Nginx du VPS:"
echo ""
echo "  server_name muscugain.woutils.com;"
echo "  location / {"
echo "    proxy_pass http://127.0.0.1:8080;"
echo "    proxy_set_header Host \$host;"
echo "    proxy_set_header X-Real-IP \$remote_addr;"
echo "    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "    proxy_set_header X-Forwarded-Proto \$scheme;"
echo "  }"
echo ""
echo "📊 Commandes utiles:"
echo "  - docker-compose ps              (voir l'état)"
echo "  - docker-compose logs -f         (voir les logs)"
echo "  - docker-compose restart         (redémarrer)"
echo "  - docker-compose down            (arrêter)"
echo ""
