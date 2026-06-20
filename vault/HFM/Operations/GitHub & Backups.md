# GitHub & Backups — HFM

## Repository
- **HFM-OS:** https://github.com/Imhere1914/HFM-OS
- **Branch:** main (code + vault)

## Push HFM to GitHub
```bash
cd ~/ai-os
git push hfm main
```

## Vault Location
`~/ai-os/vault/HFM/` — committed with codebase, pushed to HFM-OS.git

## Update Vault and Push
```bash
cd ~/ai-os
git add vault/HFM/
git commit -m "vault: update HFM notes"
git push hfm main
```

## Manual Data Backup
```bash
scp -i ~/.ssh/ai-os-deploy -r \
  root@2.24.99.83:/var/lib/ai-os/hfm/ \
  ~/hfm-data-backup-$(date +%Y%m%d)/
```

## Obsidian Git Plugin (Auto-Sync)
Install in the HFM vault (`vault/HFM/`):
1. Settings → Community Plugins → Obsidian Git
2. Auto-push interval: 10 minutes
3. Remote: set to HFM-OS.git
4. Commit message: `vault: hfm auto-sync {{date}}`
