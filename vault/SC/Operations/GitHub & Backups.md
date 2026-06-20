# GitHub & Backups — Simple Connect

## Repositories
| Repo | URL | Branch | Purpose |
|---|---|---|---|
| SC-OS | https://github.com/Imhere1914/SC-OS | main | SC AI OS codebase + vault |
| HFM-OS | https://github.com/Imhere1914/HFM-OS | main | HFM AI OS codebase + vault |

## Git Remotes (local)
```bash
git remote -v
# origin  https://github.com/Imhere1914/SC-OS.git (push/fetch)
# hfm     https://github.com/Imhere1914/HFM-OS.git (push/fetch)
```

## Push Commands
```bash
# SC (code + vault)
git push origin main

# HFM (same code, HFM vault)
git push hfm main
```

## What's Backed Up
- Full AI OS source code (server/ + src/)
- Obsidian vault (vault/SC/ and vault/HFM/)
- nginx configs are NOT in git — document key configs in this vault instead
- .env files are NEVER committed (gitignored)

## Data Backup (JSON files on VPS)
Data lives at `/var/lib/ai-os/sc/` on the VPS. Not automatically synced to GitHub.

### Manual Data Export
```bash
# Download SC data
scp -i ~/.ssh/ai-os-deploy -r root@2.24.99.83:/var/lib/ai-os/sc/ ~/sc-data-backup/

# Download HFM data
scp -i ~/.ssh/ai-os-deploy -r root@2.24.99.83:/var/lib/ai-os/hfm/ ~/hfm-data-backup/
```

## Vault Sync (Obsidian)
This vault lives at `~/ai-os/vault/SC/` and is committed with the codebase.

To sync latest notes to GitHub:
```bash
cd ~/ai-os
git add vault/
git commit -m "vault: update SC notes"
git push origin main
```

### Using Obsidian Git Plugin
Install the **Obsidian Git** community plugin in each vault for automatic sync:
1. Settings → Community Plugins → Browse → "Obsidian Git"
2. Configure: Auto pull interval, Auto push interval (e.g., every 10 min)
3. Set commit message: `vault: auto-sync {{date}}`
