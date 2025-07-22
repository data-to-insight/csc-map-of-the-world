import os

# folders to exclude
EXCLUDED_DIRS = {
    ".git", "site", "__pycache__", ".ipynb_checkpoints", ".venv",
    "env", ".mypy_cache", ".pytest_cache", ".vscode", ".DS_Store",
    ".idea", "node_modules"
}

# file extensions to exclude
EXCLUDED_EXTENSIONS = {".pyc", ".log", ".tmp"}

def print_tree(base_path, prefix=""):
    try:
        entries = sorted(os.listdir(base_path))
    except PermissionError:
        return  # skip folders that cannot be accessed

    entries = [
        e for e in entries
        if not e.startswith(".")
        and e not in EXCLUDED_DIRS
        and not (os.path.isfile(os.path.join(base_path, e)) and os.path.splitext(e)[1] in EXCLUDED_EXTENSIONS)
    ]
    count = len(entries)

    for i, entry in enumerate(entries):
        path = os.path.join(base_path, entry)
        connector = "└── " if i == count - 1 else "├── "
        if os.path.isdir(path):
            print(f"{prefix}{connector}{entry}/")
            new_prefix = "    " if i == count - 1 else "│   "
            print_tree(path, prefix + new_prefix)
        else:
            print(f"{prefix}{connector}📄 {entry}")

# start from current directory
print_tree(os.getcwd())
