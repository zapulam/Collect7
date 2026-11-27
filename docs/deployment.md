# Deployment setup

One-time setup for the keyless deploy in `.github/workflows/deploy.yml`. It creates a service account that can only deploy Hosting, usable only by this repository's `main` branch and `production` environment.

1. In the Firebase console, open **Build → Hosting** and click **Get started**. Skip the CLI steps it shows.
2. In the [Google Cloud console](https://console.cloud.google.com), open Cloud Shell and run this with your own values:

```bash
PROJECT_ID=your-firebase-project-id
GITHUB_REPO=owner/repo
SA=github-deploy
SA_EMAIL="$SA@$PROJECT_ID.iam.gserviceaccount.com"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
REPO_ID=$(curl -s "https://api.github.com/repos/$GITHUB_REPO" | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')

gcloud services enable iamcredentials.googleapis.com sts.googleapis.com --project "$PROJECT_ID"

gcloud iam service-accounts create "$SA" --project "$PROJECT_ID" --display-name "GitHub Deploy"
for ROLE in roles/firebasehosting.admin roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$SA_EMAIL" --role "$ROLE" --condition=None
done

gcloud iam workload-identity-pools create github --project "$PROJECT_ID" --location global --display-name "GitHub Deploy"
gcloud iam workload-identity-pools providers create-oidc github-actions \
  --project "$PROJECT_ID" --location global --workload-identity-pool github --display-name "GitHub Deploy" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref,attribute.environment=assertion.environment" \
  --attribute-condition "assertion.repository_id == '$REPO_ID' && assertion.ref == 'refs/heads/main' && assertion.environment == 'production'"

gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository_id/$REPO_ID"

gcloud iam workload-identity-pools providers describe github-actions \
  --project "$PROJECT_ID" --location global --workload-identity-pool github --format 'value(name)'
echo "$SA_EMAIL"
```

3. In GitHub, create an environment named `production` under **Settings → Environments**. Under **Deployment branches and tags**, select `main` only. Optionally add yourself as a required reviewer.
4. In that environment's **Environment variables** (not secrets), add `GCP_WORKLOAD_IDENTITY_PROVIDER` (the `projects/.../providers/github-actions` path printed by `describe`) and `GCP_SERVICE_ACCOUNT` (the email printed last). Both are identifiers, not secrets.
5. In **Settings → Rules → Rulesets**, require the `ci` status check before merging into `main`.

`firebase.json` also sets caching and security headers, including a Content Security Policy. If the game ever loads something from another site, allow it there or the browser will block it. The `firebase-tools` version in the workflow is pinned by hand.
