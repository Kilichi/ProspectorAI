#!/bin/bash
# Finder permite abrir este archivo con doble clic.
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
bash ./startall.sh
resultado=$?
if [ "$resultado" -ne 0 ]; then
  echo 'El arranque ha fallado. Revisa el mensaje anterior.'
  read -r -p 'Pulsa Intro para cerrar…' respuesta
fi
exit "$resultado"
