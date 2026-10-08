#!/bin/bash
# Compatible con Bash 3.2 de macOS; no necesita Node.js ni npm en el Mac.
set -euo pipefail
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
umask 077
if ! command -v docker >/dev/null 2>&1; then
  export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
fi
if ! command -v docker >/dev/null 2>&1; then
  echo 'Instala Docker Desktop y vuelve a ejecutar: bash startall.sh' >&2
  exit 1
fi
docker compose version >/dev/null
if ! docker info >/dev/null 2>&1; then
  if [ "$(uname -s)" = Darwin ]; then
    echo 'Iniciando Docker Desktop…'
    open -a Docker
  else
    echo 'Inicia Docker Desktop para continuar.' >&2
    exit 1
  fi
  intentos=0
  until docker info >/dev/null 2>&1; do
    intentos=$((intentos + 1))
    if [ "$intentos" -ge 60 ]; then
      echo 'Docker no está disponible. Comprueba Docker Desktop y sus permisos.' >&2
      exit 1
    fi
    if [ $((intentos % 5)) -eq 0 ]; then
      echo 'Esperando al motor Docker…'
    fi
    sleep 2
  done
fi
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo 'Creado backend/.env. Configura tu clave IA y tu contacto HTTP_USER_AGENT.'
fi
# Nunca ejecutar .env como un script ni imprimir sus claves.
token=$(sed -n 's/^ORCHESTRATOR_TOKEN=//p' backend/.env | tr -d '\r')
temporal=''
trap '[ -z "$temporal" ] || rm -f -- "$temporal"' EXIT
if [ -z "$token" ] || [ "$token" = '""' ] || [ "$token" = "''" ]; then
  command -v openssl >/dev/null 2>&1 || {
    echo 'Se necesita openssl para generar el token local.' >&2
    exit 1
  }
  token=$(openssl rand -hex 32)
  temporal=$(mktemp backend/.env.startall.XXXXXX)
  while IFS= read -r linea || [ -n "$linea" ]; do
    case "$linea" in
      ORCHESTRATOR_TOKEN=*) ;;
      *) printf '%s\n' "$linea" ;;
    esac
  done < backend/.env > "$temporal"
  printf 'ORCHESTRATOR_TOKEN=%s\n' "$token" >> "$temporal"
  mv -- "$temporal" backend/.env
  temporal=''
fi
chmod 600 backend/.env
unset token
docker compose config --quiet
echo 'Construyendo y arrancando MongoDB, backend, frontend y n8n…'
docker compose up -d --build --wait --wait-timeout 180
docker compose ps
echo ''
echo 'ProspectorAI: http://localhost:5173'
echo 'n8n:         http://localhost:5678'
echo 'Parar conservando los datos: bash stopall.sh'
echo 'Primera vez: configura las claves en backend/.env y sigue el apartado n8n del README.'
if [ "$(uname -s)" = Darwin ]; then
  open http://localhost:5173
fi
