#!/bin/bash

# Git Fix Script - Resolves merge conflicts and syncs repository
# This script handles the "unpulled changes must be merged first" issue

echo "🔧 Git Repository Fix Script"
echo "================================"

# Function to show current git status
show_status() {
    echo ""
    echo "📊 Current Git Status:"
    git status --short
    echo ""
}

# Function to backup current changes
backup_changes() {
    echo "💾 Creating backup of current changes..."
    git stash push -m "Backup before merge fix - $(date)"
    echo "✅ Changes backed up to stash"
}

# Function to check if we have uncommitted changes
has_uncommitted_changes() {
    ! git diff-index --quiet HEAD --
}

# Function to check if we have untracked files
has_untracked_files() {
    [ -n "$(git ls-files --others --exclude-standard)" ]
}

echo "🔍 Checking repository state..."
show_status

# Check for uncommitted changes
if has_uncommitted_changes || has_untracked_files; then
    echo "⚠️  Found uncommitted changes"
    
    # Ask user what to do with changes
    echo ""
    echo "Choose how to handle your uncommitted changes:"
    echo "1) Stash changes (recommended - keeps your work safe)"
    echo "2) Commit changes first"
    echo "3) Discard changes (DANGEROUS - will lose your work)"
    echo ""
    read -p "Enter choice (1/2/3): " choice
    
    case $choice in
        1)
            backup_changes
            ;;
        2)
            echo "📝 Committing current changes..."
            git add .
            read -p "Enter commit message: " commit_msg
            git commit -m "$commit_msg"
            echo "✅ Changes committed"
            ;;
        3)
            echo "⚠️  WARNING: This will discard all your changes!"
            read -p "Are you sure? Type 'yes' to confirm: " confirm
            if [ "$confirm" = "yes" ]; then
                git reset --hard HEAD
                git clean -fd
                echo "✅ Changes discarded"
            else
                echo "❌ Operation cancelled"
                exit 1
            fi
            ;;
        *)
            echo "❌ Invalid choice. Exiting."
            exit 1
            ;;
    esac
fi

echo ""
echo "🔄 Fetching latest changes from remote..."
git fetch origin

echo "🔍 Checking for conflicts..."
# Check if we can merge cleanly
if git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main | grep -q '<<<<<<<'; then
    echo "⚠️  Conflicts detected. Using merge strategy..."
    
    echo "🔧 Attempting automatic merge..."
    if git merge origin/main --no-edit; then
        echo "✅ Automatic merge successful!"
    else
        echo "❌ Automatic merge failed. Manual intervention needed."
        echo ""
        echo "📋 Conflict resolution steps:"
        echo "1. Edit the conflicted files shown above"
        echo "2. Remove conflict markers (<<<<<<<, =======, >>>>>>>)"
        echo "3. Save the files"
        echo "4. Run: git add ."
        echo "5. Run: git commit -m 'Resolve merge conflicts'"
        echo "6. Run: git push origin main"
        echo ""
        echo "🔍 Files with conflicts:"
        git diff --name-only --diff-filter=U
        exit 1
    fi
else
    echo "✅ No conflicts detected. Performing clean merge..."
    git merge origin/main --no-edit
fi

echo ""
echo "📤 Pushing changes to remote..."
if git push origin main; then
    echo "✅ Successfully pushed to remote!"
else
    echo "❌ Push failed. Checking for additional issues..."
    git status
    exit 1
fi

echo ""
echo "🎉 Git repository successfully synchronized!"
echo ""
echo "📊 Final status:"
show_status

# If we stashed changes earlier, ask if user wants to restore them
if git stash list | grep -q "Backup before merge fix"; then
    echo "💾 You have stashed changes from this session."
    read -p "Would you like to restore your stashed changes? (y/n): " restore
    if [ "$restore" = "y" ] || [ "$restore" = "Y" ]; then
        echo "🔄 Restoring stashed changes..."
        if git stash pop; then
            echo "✅ Stashed changes restored successfully!"
        else
            echo "⚠️  Conflicts while restoring stash. Please resolve manually:"
            echo "   git status"
            echo "   # Edit conflicted files"
            echo "   git add ."
            echo "   git stash drop"
        fi
    fi
fi

echo ""
echo "✅ Script completed successfully!"