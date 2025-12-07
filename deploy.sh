#!/bin/bash
set -e

# ===== 로컬 백업 프로젝트 경로 =====
BACKUP_PATH="/Volumes/SSD/backup/cclog-custom"

echo "Commit message:"
read COMMIT_MSG

echo "====== Web build ======"
npm run build

echo "====== Deploy to GitHub Pages ======"
npm run deploy

echo "====== Commit & Push to origin ======"
git add .
git commit -m "$COMMIT_MSG"
git push origin main

echo "====== Sync backup repository ======"
cd "$BACKUP_PATH"
git pull origin main

echo "====== Done ======"
echo "All repositories updated successfully."
