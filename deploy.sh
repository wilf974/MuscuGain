#!/bin/bash

# Script de déploiement pour MuscuGain sur VPS Docker

set -e

echo "🚀 Déploiement de MuscuGain en Docker avec HTTPS"
echo "=================================================="

# Vérifier que le fichier MuscuGain.html existe
if [ ! -f "MuscuGain.html" ]; then
    echo "❌ Erreur: MuscuGain.html non trouvé!"
    exit 1
fi

# Créer les répertoires nécessaires
echo "📁 Création des répertoires..."
mkdir -p letsencrypt certbot-webroot conf.d

# Arrêter les services existants si nécessaire
echo "⏹️  Arrêt des services existants (s'ils existent)..."
docker-compose down --remove-orphans 2>/dev/null || true

# Créer les répertoires avec les bonnes permissions
chmod 755 letsencrypt certbot-webroot conf.d

# Construire l'image Docker
echo "🔨 Construction de l'image Docker MuscuGain..."
docker-compose build --no-cache

# Démarrer Nginx et Certbot
echo "🐳 Démarrage des services Docker..."
docker-compose up -d nginx-proxy certbot

# Attendre que Nginx soit prêt
echo "⏳ Attente du démarrage de Nginx..."
sleep 5

# Générer le certificat Let's Encrypt
echo "🔒 Génération du certificat SSL Let's Encrypt pour muscugain.woutils.com..."
docker-compose run --rm certbot certonly \
    --webroot \
    -w /var/www/certbot \
    --email admin@woutils.com \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d muscugain.woutils.com

# Redémarrer Nginx pour charger les certificats
echo "🔄 Redémarrage de Nginx avec les certificats..."
docker-compose restart nginx-proxy

# Démarrer l'application MuscuGain
echo "🚀 Démarrage de l'application MuscuGain..."
docker-compose up -d muscugain

echo ""
echo "✅ Déploiement terminé avec succès!"
echo "=================================================="
echo "🌐 Votre application est disponible à: https://muscugain.woutils.com"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Vérifiez que votre application est accessible"
echo "2. Pour ajouter d'autres projets, créez des fichiers conf.d/*.conf"
echo "3. Les certificats SSL se renouvellent automatiquement"
echo ""
echo "📊 Commandes utiles:"
echo "  - docker-compose logs -f          (voir les logs)"
echo "  - docker-compose restart          (redémarrer les services)"
echo "  - docker-compose down             (arrêter et supprimer les conteneurs)"
echo ""
