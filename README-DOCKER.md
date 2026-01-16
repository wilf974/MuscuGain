# MuscuGain - Déploiement Docker avec HTTPS

Ce guide explique comment déployer MuscuGain sur un VPS avec Docker, HTTPS, et un reverse proxy Nginx sans casser les autres projets.

## Architecture

```
Internet (443/80)
    ↓
Nginx Reverse Proxy (nginx-reverse-proxy)
    ├─→ muscugain.woutils.com → MuscuGain (muscugain-app)
    └─→ autredomaine.woutils.com → Autre Service (à configurer)

Certbot gère automatiquement les certificats Let's Encrypt
```

## Structure des fichiers

```
/home/user/MuscuGain/
├── MuscuGain.html              # Votre application
├── Dockerfile                   # Image Docker pour MuscuGain
├── docker-compose.yml          # Orchestration des services
├── nginx-proxy.conf            # Configuration du reverse proxy
├── nginx.conf                  # Configuration Nginx interne
├── deploy.sh                   # Script de déploiement initial
├── .dockerignore               # Fichiers à exclure du build
├── conf.d/                     # Configurations supplémentaires (optionnel)
├── letsencrypt/                # Certificats SSL (généré)
├── certbot-webroot/            # Dossier pour validation ACME (généré)
└── ssl/                        # Certificats personnalisés (optionnel)
```

## Installation et déploiement initial

### Prérequis
- Docker et Docker Compose installés
- Accès SSH au VPS
- Domaine DNS pointant vers votre VPS (muscugain.woutils.com)

### Étapes de déploiement

1. **Connexion au VPS et positionnement**
```bash
ssh user@your-vps-ip
cd /home/user/MuscuGain
```

2. **Rendre le script exécutable et lancer le déploiement**
```bash
chmod +x deploy.sh
./deploy.sh
```

Le script va:
- Créer les répertoires nécessaires
- Construire l'image Docker
- Démarrer les services
- Générer le certificat SSL Let's Encrypt
- Mettre en ligne l'application

3. **Vérifier que tout fonctionne**
```bash
# Voir l'état des conteneurs
docker-compose ps

# Voir les logs
docker-compose logs -f

# Tester l'accès
curl https://muscugain.woutils.com
```

## Ajouter d'autres projets (sans casser MuscuGain)

Pour ajouter un autre projet, créez un fichier de configuration dans `conf.d/`:

### Exemple: Ajouter un projet Node.js

1. **Créer le fichier de configuration Nginx** (`conf.d/autreprojet.conf`):

```nginx
server {
    listen 443 ssl http2;
    server_name autreprojet.woutils.com;

    # Certificats SSL
    ssl_certificate /etc/letsencrypt/live/autreprojet.woutils.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/autreprojet.woutils.com/privkey.pem;

    # Configuration SSL (réutiliser la même pour tous les domaines)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/autreprojet.woutils.com/chain.pem;

    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/autreprojet_access.log main;
    error_log /var/log/nginx/autreprojet_error.log warn;

    # Route vers le service
    location / {
        proxy_pass http://autre-service:3000;  # Adapter le port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Acme challenge pour renouvellement certificat
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}
```

2. **Ajouter le service au docker-compose.yml**:

```yaml
  autre-app:
    image: mon-image:latest
    container_name: autre-app
    expose:
      - 3000
    networks:
      - web-network
    restart: unless-stopped
    # ... autres configurations ...
```

3. **Générer le certificat SSL pour ce domaine**:

```bash
docker-compose run --rm certbot certonly \
    --webroot \
    -w /var/www/certbot \
    --email admin@woutils.com \
    --agree-tos \
    --no-eff-email \
    -d autreprojet.woutils.com
```

4. **Redémarrer Nginx**:

```bash
docker-compose restart nginx-proxy
```

## Gestion des services

### Voir l'état
```bash
docker-compose ps
```

### Voir les logs
```bash
# Tous les logs
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f muscugain
docker-compose logs -f nginx-proxy

# Logs Nginx
docker-compose exec nginx-proxy tail -f /var/log/nginx/access.log
```

### Redémarrer les services
```bash
# Redémarrer un service
docker-compose restart muscugain

# Redémarrer tous les services
docker-compose restart
```

### Arrêter/Démarrer
```bash
# Arrêter
docker-compose down

# Démarrer
docker-compose up -d
```

### Renouveler les certificats manuellement
```bash
docker-compose run --rm certbot renew --webroot -w /var/www/certbot
docker-compose restart nginx-proxy
```

## Dépannage

### Le certificat SSL n'est pas généré
```bash
# Vérifier que Nginx est bien démarré
docker-compose ps

# Voir les logs de Certbot
docker-compose logs certbot

# Vérifier que le domaine DNS pointe vers le VPS
nslookup muscugain.woutils.com
```

### Erreur "Connection refused" au proxy
- Vérifiez que l'application est démarrée: `docker-compose ps`
- Vérifiez les logs: `docker-compose logs`
- Assurez-vous que le conteneur expose le bon port

### Les certificats n'expirent pas
- Les certificats Let's Encrypt durent 90 jours
- Certbot se renouvelle automatiquement grâce à la tâche cron intégrée
- Vérifiez les logs: `docker-compose logs certbot`

### Ajouter un certificat personnalisé
1. Placez `fullchain.pem` et `privkey.pem` dans `/home/user/MuscuGain/ssl/`
2. Modifiez `nginx-proxy.conf` pour pointer vers `/etc/nginx/ssl/`
3. Redémarrez Nginx

## Optimisations

### Performance
- Gzip est activé pour tous les types de contenu
- Cache des assets statiques (30 jours)
- HTTP/2 activé
- Limite de débit: 10 req/s en général, 30 req/s pour API

### Sécurité
- HTTPS forcé (redirection automatique)
- HSTS activé (Strict-Transport-Security)
- Headers de sécurité ajoutés (X-Frame-Options, etc.)
- TLS 1.2+ seulement
- Certificats générés automatiquement par Let's Encrypt

## Support et dépannage

Pour les certificats Let's Encrypt:
- Documentation: https://letsencrypt.org
- Limite de taux: 50 certificats par domaine par semaine

Pour Nginx:
- Documentation: https://nginx.org/en/docs/

Pour Docker:
- Documentation: https://docs.docker.com

## Notes importantes

- ⚠️ Ne supprimez pas le dossier `letsencrypt/` - il contient vos certificats!
- 🔄 Certbot se renouvelle automatiquement (vérifiez les logs régulièrement)
- 🔐 Gardez vos certificats privés sauvegardés
- 📊 Monitorez l'utilisation disque du serveur
