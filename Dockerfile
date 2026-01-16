FROM nginx:alpine

# Copier le fichier HTML
COPY MuscuGain.html /usr/share/nginx/html/index.html

# Copier la configuration Nginx pour MuscuGain
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
