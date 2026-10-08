#!/bin/bash
set -euo pipefail
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"
# Se conservan empresas, credenciales e historial en los volúmenes Docker.
docker compose down
