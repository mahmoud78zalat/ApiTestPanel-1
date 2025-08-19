#!/bin/bash

echo "🔒 Fixing Git lock file issue..."

# Remove the lock file
echo "🗑️ Removing Git lock file..."
rm -f .git/index.lock

# Check if removal was successful
if [ ! -f .git/index.lock ]; then
    echo "✅ Lock file removed successfully"
else
    echo "❌ Failed to remove lock file - trying with sudo..."
    sudo rm -f .git/index.lock
fi

# Check Git status
echo "📊 Checking Git status..."
git status

# If we're still in merge state, complete it
if git status | grep -q "All conflicts fixed but you are still merging"; then
    echo "🔄 Completing the merge..."
    git add .
    git commit -m "Resolve merge conflict in vercel.json - combined routes and env sections"
elif git status | grep -q "You have unmerged paths"; then
    echo "⚠️ There are still unresolved conflicts"
    echo "Run: git status to see which files need resolution"
else
    echo "✅ No merge in progress"
fi

# Try to push if clean
if git status | grep -q "nothing to commit, working tree clean"; then
    echo "📤 Pushing to remote..."
    git push origin main
    echo "🎉 Repository synchronized!"
elif git status | grep -q "Your branch is ahead"; then
    echo "📤 Pushing local commits..."
    git push origin main
    echo "🎉 Repository synchronized!"
fi

echo ""
echo "📊 Final Git status:"
git status --short