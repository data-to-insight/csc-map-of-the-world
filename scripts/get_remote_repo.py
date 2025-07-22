import os
import shutil
from ruamel.yaml import YAML 
import git
from git.exc import InvalidGitRepositoryError
import subprocess


'''
Quick summary.... instead of duplicating the infos on tool repo README files, we can just sparse copy the files we need from the remote repos, 
in this case/initially README and the sccm.yml file(although not doing anything with that just yet.). Doing this means we can avoid duplicated efforts
and it makes sense to maintain the details within the tool's repo, and bring into docs rather than other way around(i think?)

This script looks at the defined repo links dict below(REPOS), and clones the current readme and sccm.yml file from them, putting them into the 
appropriate tool folder in this repo, these files go into the public visible part of the documentation front end. If we need to get more than just
those two files, need to add into FILES_TO_FETCH.
'''


# target structure/fetched files mapping
# if a repo is not listed here, then the associated README is not pulled through, therefore will not appear with Documentation/Library/MKDocs front-end
REPOS = {
    "https://github.com/data-to-insight/ofsted-ilacs-scrape-tool": "ILACS_Scrape",
    "https://github.com/data-to-insight/ofsted-send-scrape-tool": "SEND_Scrape",
    "https://github.com/data-to-insight/ofsted-jtai-scrape-tool": "JTAI_Scrape",
    "https://github.com/data-to-insight/foi-csc-scrape-tool": "FOI_Scrape",
    "https://github.com/data-to-insight/hmi-probation-youth-justice-scrape": "YouthJustice_Scrape",
    "https://github.com/data-to-insight/SEND-tool": "SEND",
    "https://github.com/data-to-insight/patch": "PATCH",
    "https://github.com/data-to-insight/nvest": "NVEST",
    "https://github.com/data-to-insight/csc-validator-be-903": "Validator_903",
    "https://github.com/data-to-insight/annex-a-sen-validator-be": "Validator_SEN",
    "https://github.com/data-to-insight/csc-validator-be-cin": "Validator_CiN",
    "https://github.com/data-to-insight/cs-demand-model": "Demand_Model",
    "https://github.com/data-to-insight/d2i-contacts": "D2I_Contacts_Processing",
    "https://github.com/data-to-insight/d2i-linux-build": "D2I_Linux_IMG",
}

# tmp cloned repos 
# these can be cleaned up either by uncommenting clean-up block below or via generate_mkdocs_yml.py
CLONE_DIR = "./cloned_repos"
DEST_DIR = "./docs"  # overwriting into... 

# check clone dir exists
os.makedirs(CLONE_DIR, exist_ok=True)

# what to pull from tools repos (want .yml for later use)
# FILES_TO_FETCH = ["README.md", "sccm.yml"]
FILES_TO_FETCH = ["/README.md", "/sccm.yml"] # non-cone mode, safer apply absolute path


# clean repo url name
def get_repo_name(repo_url):
    return repo_url.rstrip("/").split("/")[-1]



# # clone repo or pull IF exists
def sparse_checkout_repo(repo_url, repo_local_path, sparse_paths):
    try:
        if os.path.exists(repo_local_path):
            shutil.rmtree(repo_local_path)

        print(f"Cloning sparse repo into {repo_local_path}")

        # revised sparse process will only run in git 2.9+
        subprocess.run([
            "git", "clone",
            "--filter=blob:none",
            "--sparse",
            repo_url,
            repo_local_path
        ], check=True)

        # disable cone mode - allow single file access (avoid whole repo clone)
        subprocess.run(["git", "sparse-checkout", "init", "--no-cone"], cwd=repo_local_path, check=True)

        # sparse paths (cause we disabled cone, will work with filenames)
        subprocess.run(["git", "sparse-checkout", "set", *sparse_paths], cwd=repo_local_path, check=True)

        return True

    except subprocess.CalledProcessError as e:
        print(f"Sparse checkout failed for {repo_url}:\n{e}")
        return False

# file(s) to mapped(above) local folder
def copy_to_target(src_path, target_subfolder, filename):
    target_path = os.path.join(DEST_DIR, target_subfolder)
    os.makedirs(target_path, exist_ok=True)
    shutil.copy2(src_path, os.path.join(target_path, filename))

# each repo
for repo_url, folder_name in REPOS.items():
    repo_name = get_repo_name(repo_url)
    repo_local_path = os.path.join(CLONE_DIR, repo_name)

    success = sparse_checkout_repo(repo_url, repo_local_path, FILES_TO_FETCH)

    if success:

        for rel_path in FILES_TO_FETCH:
            local_rel_path = rel_path.lstrip("/")  # rem lead /for filesystem access
                                                # when checking for file locally (os.path.join fails otherwise)
            full_path = os.path.join(repo_local_path, local_rel_path)
            if os.path.exists(full_path):
                copy_to_target(full_path, folder_name, local_rel_path)
                print(f"copied {local_rel_path} from {repo_name} to /{folder_name}/")
            else:
                print(f"{local_rel_path} not found in {repo_name}")

    else:
        print(f"Skipping file copy for {repo_name} due to sparse checkout error.")



# clean-up
# But only run if you're aware that no other proc you're running a refresh on needs the cloned repos in-place
# e.g. generate_mkdocs_yml.py also cleans up after running
# shutil.rmtree(CLONE_DIR)  # IF removing cloned repos after copy


## tmp ref list of local tool folder names
# Annex_A_Loader
# Benchmarking_BMt
# ChAT
# CiN_Census_Validation
# CSC_API_Dataflows
# Cut_the_ChAT
# Demand_Modelling_2021
# Demand_Modelling_CLA
# Early_Help_Quarterly_Collection
# FOI_Scrape
# ILACS_Scrape
# JTAI_Scrape
# NVEST_Contacts
# RIIA_Benchmarking
# SEND
# SEND_Scrape
# SSDA903_Validation
# Safeguarding_Pressures_Request
# SSD