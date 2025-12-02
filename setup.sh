#!/bin/bash 
# setup.sh — install deps and wire up mkdocs/python aliases for this repo
# chmod +x setup.sh


set -euo pipefail

echo "==> MapOfTheWorld setup starting"

# Pick a python binary
if command -v python3 >/dev/null 2>&1; then
  PY_BIN="python3"
elif command -v python >/dev/null 2>&1; then
  PY_BIN="python"
else
  echo "No py interpreter found on PATH"
  exit 1
fi

echo "Using interpreter: $PY_BIN"

echo "==> Upgrading pip"
"$PY_BIN" -m pip install --upgrade pip

echo "==> Installing Py requirements"
"$PY_BIN" -m pip install --user -r requirements.txt

# Chk ~/.local/bin is on PATH for this shell (in case ever rely on mkdocs script itself)
if [ -d "$HOME/.local/bin" ]; then
  export PATH="$HOME/.local/bin:$PATH"
fi

# Append aliases to rc files so future terminals auto get them
add_snippet_to_rc() {
  local rcfile="$1"

  # Create file if missing
  if [ ! -f "$rcfile" ]; then
    touch "$rcfile"
  fi

  # Only add once
  if ! grep -q "MapOfTheWorld dev helpers" "$rcfile" 2>/dev/null; then
    cat >>"$rcfile" <<'EOF'

# MapOfTheWorld dev helpers
# ensure local pip scripts are available
if [ -d "$HOME/.local/bin" ]; then
  export PATH="$HOME/.local/bin:$PATH"
fi
alias python="python3"
alias mkdocs="python3 -m mkdocs"
EOF
    echo "Added dev helper snippet to $rcfile"
  else
    echo "Dev helper snippet already present in $rcfile"
  fi
}

echo "==> Updating shell rc files"
add_snippet_to_rc "$HOME/.bashrc"
add_snippet_to_rc "$HOME/.zshrc"

echo "==> Setup complete"
echo "Open new terminal, 'mkdocs serve' should now work"
echo "or run: source ~/.bashrc  or  source ~/.zshrc"
