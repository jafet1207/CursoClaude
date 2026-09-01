#!/usr/bin/env bash
# Puerta de calidad. 0 = se puede cerrar. 2 = algo falló.
set -u
npm test || { echo "La suite falló." >&2; exit 2; }
echo "Verificación completa."
