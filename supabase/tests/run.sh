#!/usr/bin/env bash
# Corre un test SQL contra la base de prod vía la Management API (begin/rollback: no deja
# rastro). Uso: supabase/tests/run.sh match_convocatoria.sql
set -euo pipefail

ARCHIVO="${1:?uso: run.sh <archivo.sql>}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUTA="$DIR/$ARCHIVO"
REF="ydnafjmznntfmzrsijko"
TOKEN_FILE="$HOME/.soliloq-deploy/supabase-token.txt"

[ -f "$RUTA" ] || { echo "no existe: $RUTA" >&2; exit 1; }
[ -f "$TOKEN_FILE" ] || { echo "falta el PAT en $TOKEN_FILE" >&2; exit 1; }

PAYLOAD="$(python3 -c "import json,sys; print(json.dumps({'query': open(sys.argv[1]).read()}))" "$RUTA")"

RESP="$(curl -sS -w $'\n%{http_code}' \
  -H "Authorization: Bearer $(cat "$TOKEN_FILE")" \
  -H "Content-Type: application/json" \
  -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  --data "$PAYLOAD")"

CODE="${RESP##*$'\n'}"
BODY="${RESP%$'\n'*}"
echo "$BODY"
[ "$CODE" = "201" ] || { echo "FALLÓ (HTTP $CODE)" >&2; exit 1; }
echo "OK"
