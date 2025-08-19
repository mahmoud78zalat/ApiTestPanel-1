#!/bin/bash

# Quick Git Fix - One-liner solution for merge conflicts
# Use this for a fast automated fix

echo "🚀 Quick Git Fix - Automated Solution"
echo "====================================="

# Backup current work
echo "💾 Backing up current changes..."
git stash push -m "Auto-backup $(date)"

# Fetch and reset to match remote
echo "🔄 Syncing with remote..."
git fetch origin
git reset --hard origin/main

# Restore backed up changes
echo "🔄 Restoring your changes..."
if git stash list | head -1 | grep -q "Auto-backup"; then
    git stash pop
    echo "✅ Your changes have been restored"
else
    echo "ℹ️  No changes to restore"
fi

# Push any new commits
echo "📤 Pushing to remote..."
git push origin main

echo "✅ Git repository fixed and synchronized!"
echo "📊 Current status:"
git status --short