# MuscuGain - Déploiement Docker sur VPS (sans casser les autres projets)

Cette configuration déploie MuscuGain en Docker sur votre VPS tout en s'intégrant au reverse proxy Nginx existant qui gère déjà les autres domaines HTTPS.

## Architecture

```
Internet (443/80 - Reverse Proxy existant)
    ↓
Nginx Reverse Proxy existant du VPS
    ├─→ autredomaine.woutils.com → Service existant
    ├─→ muscugain.woutils.com → MuscuGain Docker
    └─→ autre.woutils.com → Autre service
```

MuscuGain s'exécute comme un simple conteneur Nginx sans exposer de ports au host. Le reverse proxy existant route le trafic HTTPS vers MuscuGain via le réseau Docker interne.

## Prérequis

- Docker et Docker Compose installés
- Domaine DNS `muscugain.woutils.com` pointant vers votre VPS
- Reverse proxy Nginx existant gérant les certificats SSL/TLS

## Installation

### 1. Cloner et déployer

```bash
cd /opt/apps
git clone -b claude/docker-vps-https-deploy-ZOwSB https://github.com/wilf974/MuscuGain.git
cd MuscuGain
chmod +x deploy.sh
./deploy.sh
```

### 2. Configurer le reverse proxy existant

Une fois le déploiement terminé, vous devez ajouter une configuration pour MuscuGain au reverse proxy Nginx existant.

**Localisation typique:** `/etc/nginx/sites-available/` ou `/etc/nginx/conf.d/`

**Fichier à créer:** `muscugain-upstream.conf` (ou dans sites-available)

```nginx
# Configuration pour MuscuGain en amont
upstream muscugain_backend {
    server muscugain-app:80;
}

server {
    listen 443 ssl http2;
    server_name muscugain.woutils.com;

    # ===== CERTIFICATS SSL (à adapter si nécessaire) =====
    ssl_certificate /etc/letsencrypt/live/muscugain.woutils.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/muscugain.woutils.com/privkey.pem;

    # Configuration SSL commune
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Headers de sécurité
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/muscugain_access.log;
    error_log /var/log/nginx/muscugain_error.log;

    # Proxy vers MuscuGain Docker
    location / {
        proxy_pass http://muscugain_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirection HTTP → HTTPS
server {
    listen 80;
    server_name muscugain.woutils.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. Redémarrer Nginx

```bash
# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
# ou
sudo service nginx restart
```

### 4. Vérifier l'accessibilité

```bash
# Tester en HTTP (redirection)
curl -I http://muscugain.woutils.com

# Tester en HTTPS
curl -I https://muscugain.woutils.com

# Vérifier les logs Docker
docker-compose logs -f muscugain
```

## Structure du projet

```
/opt/apps/MuscuGain/
├── MuscuGain.html              # Application
├── Dockerfile                  # Image Docker
├── docker-compose.yml          # Orchestre uniquement MuscuGain
├── nginx.conf                  # Config interne (servie par Dockerfile)
├── deploy.sh                   # Script de déploiement
├── .dockerignore               # Fichiers à ignorer au build
├── .env.example                # Variables d'environnement
└── README-VPS.md              # Ce fichier
```

## Gestion

### Voir l'état
```bash
docker-compose ps
```

### Voir les logs
```bash
# Tous les logs
docker-compose logs -f

# Logs d'une section
docker-compose logs -f muscugain
```

### Redémarrer MuscuGain
```bash
docker-compose restart muscugain
```

### Arrêter
```bash
docker-compose down
```

### Mettre à jour
```bash
git pull origin claude/docker-vps-https-deploy-ZOwSB
docker-compose up -d --build muscugain
```

## Dépannage

### La page est vide ou erreur 502
```bash
# Vérifier que le conteneur tourne
docker-compose ps

# Vérifier les logs Docker
docker-compose logs muscugain

# Tester directement le conteneur
curl http://localhost/ -I
# Devrait renvoyer "HTTP/1.1 200 OK"
```

### Erreur de connexion au conteneur
```bash
# Vérifier que le conteneur est sur le bon réseau
docker network ls
docker network inspect vps-network

# Le conteneur muscugain-app doit être connecté à "vps-network"
```

### Certificat SSL non valide
- Vérifier que le certificat Let's Encrypt existe et est valide
- Le renouvellement automatique doit être configuré sur le reverse proxy existant
- Vérifier `/etc/letsencrypt/live/muscugain.woutils.com/`

### Logs Nginx du reverse proxy
```bash
# Voir les logs d'accès
sudo tail -f /var/log/nginx/muscugain_access.log

# Voir les erreurs
sudo tail -f /var/log/nginx/muscugain_error.log
```

## Notes importantes

- ⚠️ Le conteneur MuscuGain est sur le réseau Docker interne `vps-network` uniquement
- ✅ Le reverse proxy existant gère tous les certificats SSL
- 🔒 Les autres projets ne sont pas affectés
- 📊 Les logs du reverse proxy sont sur le host VPS
- 🔄 Les certificats Let's Encrypt sont gérés par le reverse proxy existant

## Support

Si vous avez des problèmes:
1. Vérifiez que le DNS pointe vers le VPS
2. Vérifiez les logs Docker: `docker-compose logs`
3. Vérifiez la configuration Nginx: `sudo nginx -t`
4. Vérifiez que le port 80/443 n'est pas bloqué par un pare-feu
