# Deployment en DigitalOcean

## PASO 1: Crear el Droplet

En DigitalOcean dashboard:
- Image: Ubuntu 24.04 LTS x64
- Size: /mes (2 vCPU, 2GB RAM)
- Region: Elegir cercano a usuarios
- Authentication: SSH key

Anotar la IP (ej: 162.243.162.154)

## PASO 2: Conectar al droplet

ssh root@162.243.162.154

## PASO 3: Instalar Node.js

apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

## PASO 4: Clonar el repositorio

mkdir -p /var/www
cd /var/www
git clone https://github.com/nicodevgames/Sebas-Nico-Clones.git
cd Sebas-Nico-Clones/pragmatic-play-motor
npm install

## PASO 5: Configurar Nginx

apt install -y nginx

cat > /etc/nginx/sites-available/motor << 'EOFLC'
server {
    listen 80;
    server_name 162.243.162.154;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOFLC

ln -s /etc/nginx/sites-available/motor /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl start nginx
systemctl enable nginx

## PASO 6: Levantar servidor con PM2

npm install -g pm2
cd /var/www/Sebas-Nico-Clones/pragmatic-play-motor
pm2 start server.js --name pragmatic-motor
pm2 save
pm2 startup
pm2 status

## PASO 7: Verificar

curl http://localhost:3000/ | head -20

Navegador: http://162.243.162.154/

## PASO 8: Monitoreo

pm2 logs pragmatic-motor
watch -n 1 'ps aux | grep node'

## PASO 9: Actualizaciones

cd /var/www/Sebas-Nico-Clones/pragmatic-play-motor
git pull origin main
npm install
pm2 restart pragmatic-motor

## PASO 10: SSL/HTTPS (Opcional)

apt install -y certbot python3-certbot-nginx
certbot --nginx -d tudominio.com

## Troubleshooting

Puerto 3000 en uso → pkill -9 node
Connection refused → ps aux | grep node
Motor no carga → pm2 logs pragmatic-motor
Out of memory → node --max-old-space-size=4096 server.js

## Verificación final

✅ Droplet activo
✅ Node.js instalado
✅ Repo clonado
✅ Nginx corriendo
✅ Servidor Node activo (PM2)
✅ http://162.243.162.154/ accesible

Deployment completado al 100%
