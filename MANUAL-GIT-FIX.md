# Manual Git Lock Fix Commands

Since Replit restricts automated Git operations, you need to run these commands manually in the **Shell** tab.

## Step 1: Remove Lock File
```bash
rm -f .git/index.lock
```

## Step 2: Check Git Status
```bash
git status
```

## Step 3: Complete the Merge
Since we already resolved the vercel.json conflict, run:

```bash
git add vercel.json
git add resolve-merge-manually.md
git add MANUAL-GIT-FIX.md
git commit -m "Resolve merge conflict in vercel.json - combined routes and env sections"
```

## Step 4: Push Changes
```bash
git push origin main
```

## Alternative: Abort and Reset (if above fails)
If the merge completion fails, abort and reset:

```bash
git merge --abort
git fetch origin
git reset --hard origin/main
git push origin main
```

## Verification
After completion, verify everything is clean:
```bash
git status
```

You should see: "nothing to commit, working tree clean"

## Quick One-Liner (Copy-Paste All at Once)
```bash
rm -f .git/index.lock && git add . && git commit -m "Resolve merge conflicts" && git push origin main
```

If that fails, use the abort method:
```bash
rm -f .git/index.lock && git merge --abort && git fetch origin && git reset --hard origin/main && git push origin main
```