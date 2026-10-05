# Backend API – serwer czasu NTP

Backend dostarcza aplikacji klienckiej wzorzec czasu pobierany z serwerów NTP Głównego Urzędu Miar (GUM). Wystawia proste REST API bez autoryzacji.

Domyślna instancja dostępna pod adresem: `https://timeserv.maksplus.xyz`

## API

### `GET /api/time`

Zwraca aktualny czas wraz z metadanymi synchronizacji.

**Odpowiedź (200 OK)**

```json
{
  "success": true,
  "timestamp": "2026-10-01T00:01:23.456789+00:00",
  "unixTime": 1790812883456,
  "source": "tempus1.gum.gov.pl",
  "serverType": "primary",
  "offset": 0.0005,
  "delay": 0.018
}
```

| Pole | Typ | Opis |
|---|---|---|
| `success` | bool | `true` jeśli czas pochodzi z NTP lub zewnętrznego API |
| `timestamp` | string | Czas w formacie ISO 8601, zawsze w UTC (`+00:00`) |
| `unixTime` | int | Czas Unix w milisekundach – zalecane pole do synchronizacji |
| `source` | string | Źródło czasu (patrz: łańcuch źródeł poniżej) |
| `serverType` | string | `primary`, `backup` lub `http-fallback` |
| `offset` | float | Przesunięcie zegara względem serwera NTP w sekundach |
| `delay` | float | Opóźnienie sieciowe round-trip w sekundach |

**Błąd (503)**

```json
{
  "success": false,
  "error": "Wszystkie źródła czasu niedostępne",
  "fallback": "2026-10-01T00:01:23.456789+00:00"
}
```

W przypadku błędu 503 pole `fallback` zawiera czas lokalny serwera. Aplikacja kliencka powinna potraktować go jako ostateczność i poinformować użytkownika o braku synchronizacji z GUM.

### `GET /health`

Health check — zwraca status serwisu.

```json
{
  "status": "ok",
  "service": "NTP Time Server",
  "timestamp": "2026-10-01T00:01:23.456789+00:00",
  "servers": ["tempus1.gum.gov.pl", "tempus2.gum.gov.pl"]
}
```

### `GET /`

Podstawowe informacje o serwisie: nazwa, wersja, lista endpointów i serwerów NTP.

## Łańcuch źródeł czasu

Backend próbuje uzyskać czas w następującej kolejności:

1. `tempus1.gum.gov.pl` — główny serwer NTP GUM (UDP 123)
2. `tempus2.gum.gov.pl` — zapasowy serwer NTP GUM (UDP 123)
3. `worldtimeapi.org` — fallback HTTPS gdy NTP niedostępne
4. Nagłówek `Date:` z `cloudflare.com` — ostateczny fallback HTTPS

Pole `source` w odpowiedzi wskazuje które źródło zostało użyte, co pozwala aplikacji klienckiej poinformować użytkownika o jakości synchronizacji. Odpowiedzi z `serverType: "http-fallback"` nie pochodzą z GUM – aplikacja kliencka oznacza je jako serwer zapasowy. Nagłówek `Date:` ma rozdzielczość 1 sekundy, więc w tym trybie dokładność jest odpowiednio mniejsza.

## Własna instancja

Kod źródłowy backendu dostępny jest w pliku `backend/app.py`.

### Wymagania

- Python 3.10+
- Wychodzący ruch UDP na porcie 123 do hostów `tempus1.gum.gov.pl` i `tempus2.gum.gov.pl`

```
flask
flask-cors
gunicorn
ntplib
requests
```

```bash
pip install flask flask-cors gunicorn ntplib requests
```

### Uruchomienie lokalne

```bash
python app.py
```

### Instalacja na serwerze (Ubuntu 24.04)

```bash
cd backend
sudo ./install.sh time.example.com
```

Skrypt:
- instaluje Pythona, Nginx i Certbota,
- tworzy użytkownika systemowego `ntp-backend`, z którego uprawnieniami działa usługa,
- umieszcza aplikację w `/opt/ntp-backend` (virtualenv + zależności),
- rejestruje usługę systemd `ntp-backend` (Gunicorn na `127.0.0.1:8080`),
- dodaje stronę Nginx `timeserv` z podaną domeną jako reverse proxy.

Istniejąca konfiguracja Nginx nie jest modyfikowana. Jeśli aktywna jest domyślna strona (`sites-enabled/default`), skrypt jedynie o tym poinformuje.

Certyfikat SSL można następnie uzyskać poleceniem `sudo certbot --nginx -d <domena> -m <email> --agree-tos`. Jeśli serwer działa za proxy zapewniającym TLS (np. Cloudflare z proxy włączonym dla domeny), ten krok można pominąć. Warto wtedy ograniczyć ruch przychodzący na porty 80/443 do adresów IP proxy.

### Uwaga dotycząca portu UDP 123

Wielu dostawców hostingu współdzielonego oraz część VPS-ów blokuje wychodzący ruch UDP na porcie 123 na poziomie sieci. W takim przypadku backend automatycznie przełączy się na fallback HTTP (`worldtimeapi.org` lub nagłówek `Date:`), jednak synchronizacja nie będzie oparta bezpośrednio o wzorzec GUM.

Przed wyborem hostingu warto zweryfikować dostępność portu:

```bash
printf '\x1b\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00' \
  | nc -u -w 3 tempus1.gum.gov.pl 123 | od -An -tx1 | head -3
```

Jeśli komenda zwróci dane hex — port jest dostępny. Pusta odpowiedź oznacza blokadę.
