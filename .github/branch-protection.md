# Branch Protection Configuration

This document outlines the recommended branch protection rules for the repository.

## Main Branch Protection

The following rules should be configured for the `main` branch:

### Required Status Checks
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- Required checks:
  - `quality-checks`
  - `test`
  - `build`
  - `performance`
  - `validate-extension`

### Pull Request Requirements
- ✅ Require pull request reviews before merging
- ✅ Require review from code owners (when CODEOWNERS file exists)
- ✅ Dismiss stale reviews when new commits are pushed
- ✅ Require review from at least 1 reviewer (can be self-review for solo development)

### Additional Restrictions
- ✅ Restrict pushes that create files larger than 100MB
- ✅ Require signed commits (optional, recommended for production)
- ✅ Include administrators in these restrictions

### Auto-merge Settings
- ✅ Allow auto-merge for pull requests
- ✅ Automatically delete head branches after merge

## Configuration Steps

1. Go to repository Settings → Branches
2. Click "Add rule" for `main` branch
3. Configure the settings as outlined above
4. Save the protection rule

## GitHub CLI Configuration

Alternatively, use GitHub CLI to set up branch protection:

```bash
# Install GitHub CLI if not already installed
# gh auth login

# Set up branch protection for main
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["quality-checks","test","build","performance","validate-extension"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null
```

## Notes

- These settings ensure code quality and prevent direct pushes to main
- All changes must go through pull requests with CI validation
- The pipeline will automatically run on all PRs and pushes
- Failed checks will block merging until resolved 