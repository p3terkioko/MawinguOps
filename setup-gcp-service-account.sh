# Google Cloud Service Account Setup Script
# Run this in Google Cloud Shell or with gcloud CLI

# Set your project ID
PROJECT_ID="your-project-id"
SERVICE_ACCOUNT_NAME="github-actions-deploy"
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"

echo "Setting up service account for GitHub Actions deployment..."

# Create service account
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --description="Service account for GitHub Actions deployment" \
    --display-name="GitHub Actions Deploy"

# Grant necessary permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/iam.serviceAccountUser"

# Generate and download the key file
gcloud iam service-accounts keys create github-actions-key.json \
    --iam-account=$SERVICE_ACCOUNT_EMAIL

echo "✅ Service account created successfully!"
echo "📄 Key file: github-actions-key.json"
echo ""
echo "Next steps:"
echo "1. Copy the contents of github-actions-key.json"
echo "2. Add it as GCP_SA_KEY secret in GitHub"
echo "3. Delete the local key file for security"