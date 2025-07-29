#!/bin/bash 
# setup.sh — Install all dependencies for map/knowledge base
# chmod +x setup.sh

echo "Installing dependencies..."

python3 -m pip install --upgrade pip

# ~/.local/bin is in PATH for user-level install
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
  export PATH="$HOME/.local/bin:$PATH"
  echo "Added ~/.local/bin to PATH (and saved to ~/.bashrc)"
fi

# Py packages to user site
python3 -m pip install --user -r requirements.txt

echo "Environment setup complete. Might need to run: source ~/.bashrc"
