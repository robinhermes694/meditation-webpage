#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing Mindful web app dependencies"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 is required: https://www.python.org/downloads/" >&2
  exit 1
fi

PIP_BIN="pip3"
if ! command -v "${PIP_BIN}" >/dev/null 2>&1; then
  PIP_BIN="pip"
fi

if ! command -v "${PIP_BIN}" >/dev/null 2>&1; then
  echo "pip is required to install Python dependencies" >&2
  exit 1
fi

# Create an isolated venv so dependencies don't pollute the system Python
VENV_DIR="${VENV_DIR:-.venv}"
echo "==> Creating Python venv at ${VENV_DIR}"
python3 -m venv "${VENV_DIR}"

# shellcheck disable=SC1091
source "${VENV_DIR}/bin/activate"

echo "==> Upgrading pip/setuptools/wheel"
pip install --upgrade pip setuptools wheel

echo "==> Installing edge-tts"
pip install edge-tts

echo "==> Installing kokoro-onnx"
pip install "kokoro-onnx>=0.5.0"

echo "==> Installing kokoro-tts CLI if available"
pip install "kokoro-tts" || true

echo "==> Done. Activate the venv with:"
echo "     source ${VENV_DIR}/bin/activate"
