#!/bin/bash

echo "🔧 Completing Git merge..."

# Add the resolved file
echo "📁 Adding resolved vercel.json..."
git add vercel.json

# Add any other changed files
echo "📁 Adding other changed files..."
git add resolve-merge-manually.md

# Complete the merge commit
echo "✅ Completing merge commit..."
git commit -m "Resolve merge conflict in vercel.json - combined routes and env sections"

# Push to remote
echo "📤 Pushing to remote..."
git push origin main

echo "🎉 Merge completed successfully!"
echo ""
echo "📊 Final status:"
git status --short