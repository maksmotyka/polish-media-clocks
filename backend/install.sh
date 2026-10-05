#!/bin/bash
# =============================================================
# NTP Time Server - instalacja na Ubuntu 24.04
# Użycie: sudo ./install.sh <domena>
# =============================================================
set -e

DOMAIN="$1"
APP_DIR="/opt/ntp-backend"
APP_USER="ntp-backend"

if [ -z "$DOMAIN" ]; then
    echo "Użycie: sudo $0 <domena>   (np. sudo $0 time.example.com)"
    exit 1
fi

if [ "$EUID" -ne 0 ]; then
    echo "Skrypt wymaga uprawnień roota (sudo)."
    exit 1
fi

echo ""
echo "=============================================="
echo " NTP Backend - instalacja (Ubuntu 24.04)"
echo "=============================================="
echo ""

echo "[1/6] Instalacja pakietów systemowych..."
apt update -q
apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx

echo "[2/6] Tworzenie użytkownika systemowego $APP_USER..."
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin "$APP_USER"

echo "[3/6] Tworzenie katalogu aplikacji..."
# Pliki należą do roota - usługa może je czytać, ale nie modyfikować
mkdir -p "$APP_DIR"
cp app.py "$APP_DIR/"

echo "[4/6] Tworzenie virtualenv i instalacja zależności..."
python3 -m venv "$APP_DIR/venv"
"$APP_DIR/venv/bin/pip" install --quiet --upgrade pip
"$APP_DIR/venv/bin/pip" install --quiet -r requirements.txt

echo "[5/6] Konfiguracja serwisu systemd..."
cp ntp-backend.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ntp-backend
systemctl restart ntp-backend

echo "[6/6] Konfiguracja Nginx..."
sed "s/__DOMAIN__/$DOMAIN/" nginx-timeserv.conf > /etc/nginx/sites-available/timeserv
ln -sf /etc/nginx/sites-available/timeserv /etc/nginx/sites-enabled/timeserv
nginx -t && systemctl enable nginx && systemctl reload nginx

echo ""
echo "=============================================="
echo " Instalacja zakończona!"
echo "=============================================="
echo ""
echo " Test lokalny:"
sleep 2
curl -s http://127.0.0.1:8080/api/time | python3 -m json.tool
echo ""
if [ -e /etc/nginx/sites-enabled/default ]; then
    echo " Uwaga: aktywna jest domyślna strona Nginx (sites-enabled/default)."
    echo " Jeśli nie jest potrzebna, możesz ją wyłączyć ręcznie:"
    echo "   sudo rm /etc/nginx/sites-enabled/default && sudo systemctl reload nginx"
    echo ""
fi
echo " Aby włączyć SSL (pomiń, jeśli TLS zapewnia proxy, np. Cloudflare), uruchom:"
echo "   sudo certbot --nginx -d $DOMAIN -m <twój-email> --agree-tos"
echo ""
