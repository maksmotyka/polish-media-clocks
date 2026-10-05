#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Flask, jsonify
from flask_cors import CORS
import ntplib
import requests
from datetime import datetime, timezone
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

NTP_SERVERS = [
    'tempus1.gum.gov.pl',
    'tempus2.gum.gov.pl'
]

def get_ntp_time(server, timeout=3):
    try:
        client = ntplib.NTPClient()
        response = client.request(server, version=3, timeout=timeout)
        ntp_time = datetime.fromtimestamp(response.tx_time, timezone.utc)
        return {
            'success': True,
            'timestamp': ntp_time.isoformat(),
            'unixTime': int(response.tx_time * 1000),
            'source': server,
            'offset': response.offset,
            'delay': response.delay
        }
    except Exception as e:
        logger.error(f"Błąd NTP {server}: {str(e)}")
        return None

def get_time_via_worldtimeapi(timeout=5):
    try:
        r = requests.get(
            "https://worldtimeapi.org/api/timezone/Europe/Warsaw",
            timeout=timeout
        )
        r.raise_for_status()
        data = r.json()
        dt = datetime.fromisoformat(data["datetime"]).astimezone(timezone.utc)
        return {
            'success': True,
            'timestamp': dt.isoformat(),
            'unixTime': int(dt.timestamp() * 1000),
            'source': 'worldtimeapi.org',
            'offset': 0.0,
            'delay': 0.0
        }
    except Exception as e:
        logger.error(f"Błąd worldtimeapi.org: {str(e)}")
        return None

def get_time_via_http_header(timeout=5):
    try:
        r = requests.head("https://www.cloudflare.com", timeout=timeout)
        date_str = r.headers.get("Date")
        if not date_str:
            raise ValueError("Brak nagłówka Date")
        dt = datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %Z").replace(tzinfo=timezone.utc)
        return {
            'success': True,
            'timestamp': dt.isoformat(),
            'unixTime': int(dt.timestamp() * 1000),
            'source': 'http-header (cloudflare.com)',
            'offset': 0.0,
            'delay': 0.0
        }
    except Exception as e:
        logger.error(f"Błąd HTTP header fallback: {str(e)}")
        return None

@app.route('/api/time', methods=['GET'])
def get_time():
    logger.info("Zapytanie o czas")

    for i, server in enumerate(NTP_SERVERS):
        server_type = 'primary' if i == 0 else 'backup'
        if i > 0:
            logger.warning("tempus1 niedostępny, próba tempus2...")
        result = get_ntp_time(server)
        if result:
            result['serverType'] = server_type
            logger.info(f"✓ NTP: {server}")
            return jsonify(result)

    logger.warning("Oba NTP niedostępne, próba worldtimeapi.org...")
    result = get_time_via_worldtimeapi()
    if result:
        result['serverType'] = 'http-fallback'
        logger.info("✓ worldtimeapi.org")
        return jsonify(result)

    logger.warning("worldtimeapi niedostępne, próba Cloudflare header...")
    result = get_time_via_http_header()
    if result:
        result['serverType'] = 'http-fallback'
        logger.info("✓ cloudflare.com header")
        return jsonify(result)

    logger.error("⚠ Wszystkie źródła czasu niedostępne")
    return jsonify({
        'success': False,
        'error': 'Wszystkie źródła czasu niedostępne',
        'fallback': datetime.now(timezone.utc).isoformat()
    }), 503

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'service': 'NTP Time Server',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'servers': NTP_SERVERS
    })

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        'service': 'NTP Time Server',
        'version': '2.1.0',
        'endpoints': {
            '/api/time': 'Pobierz aktualny czas',
            '/health': 'Status serwisu'
        },
        'ntp_servers': NTP_SERVERS
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False)
