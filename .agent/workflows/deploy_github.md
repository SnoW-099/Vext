---
description: Manual Deployment to GitHub
---

# Deploy to GitHub

This workflow ensures changes are pushed to GitHub correctly without triggering unwanted auto-deployments if configured otherwise.

1.  **Stage Changes**
    Run `git add -A` to stage all modified files.

2.  **Commit Changes**
    Run `git commit -m "feat(update): [Description of changes]"`
    
    *Example:* `git commit -m "fix(ui): dynamic grade text"`

3.  **Push to Remote**
    Run `git push` to upload changes to the `main` branch.

// turbo-all
