#!/usr/bin/env bash
# Corre un test SQL (o todos) contra la base de prod vía la Management API.
# Cada archivo va en begin/rollback: no deja rastro.
#
#   supabase/tests/run.sh                       # todos los *.sql del directorio
#   supabase/tests/run.sh match_convocatoria.sql
#
# Token: $SUPABASE_ACCESS_TOKEN si está seteado (CI), si no ~/.soliloq-deploy/supabase-token.txt
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REF="ydnafjmznntfmzrsijko"

if [ -n "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  TOKEN="$SUPABASE_ACCESS_TOKEN"
elif [ -f "$HOME/.soliloq-deploy/supabase-token.txt" ]; then
  TOKEN="$(cat "$HOME/.soliloq-deploy/supabase-token.txt")"
else
  echo "falta el token (SUPABASE_ACCESS_TOKEN o ~/.soliloq-deploy/supabase-token.txt)" >&2
  exit 1
fi

correr() {
  local ruta="$1"
  echo "── $(basename "$ruta")"
  local payload resp code body
  payload="$(python3 -c "import json,sys; print(json.dumps({'query': open(sys.argv[1]).read()}))" "$ruta")"
  resp="$(curl -sS -w $'\n%{http_code}' \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -X POST "https://api.supabase.com/v1/projects/$REF/database/query" --data "$payload")"
  code="${resp##*$'\n'}"
  body="${resp%$'\n'*}"
  echo "$body"
  [ "$code" = "201" ] || { echo "  FALLÓ (HTTP $code)" >&2; return 1; }
  case "$body" in *OK*) echo "  ok" ;; *) echo "  sin marca OK — revisar" >&2; return 1 ;; esac
}

if [ $# -ge 1 ]; then
  correr "$DIR/$1"
else
  fallo=0
  for f in "$DIR"/*.sql; do correr "$f" || fallo=1; done
  exit $fallo
fi
