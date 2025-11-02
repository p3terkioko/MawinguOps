# Google Cloud deployment script for Mawingu OPS
# Configured for ZERO COST using Always Free tier

Write-Host "Deploying Mawingu OPS to Google Cloud Run (Always Free Tier)" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan

# Check if gcloud is available
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Google Cloud SDK not found in PATH" -ForegroundColor Red
    Write-Host "Please install Google Cloud SDK and restart PowerShell" -ForegroundColor Red
    exit 1
}

# Project configuration
$PROJECT_ID = Read-Host "Enter your Google Cloud Project ID"
if ([string]::IsNullOrWhiteSpace($PROJECT_ID)) {
    Write-Host "Error: Project ID is required" -ForegroundColor Red
    exit 1
}

$SERVICE_NAME = "mawingu-ops"
$REGION = "us-central1"  # Always Free tier region

Write-Host "Project ID: $PROJECT_ID" -ForegroundColor Green
Write-Host "Service Name: $SERVICE_NAME" -ForegroundColor Green
Write-Host "Region: $REGION" -ForegroundColor Green

# Authenticate if needed
Write-Host "Checking authentication..." -ForegroundColor Yellow
$authCheck = gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>$null
if ([string]::IsNullOrWhiteSpace($authCheck)) {
    Write-Host "Please authenticate with Google Cloud..." -ForegroundColor Yellow
    gcloud auth login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Authentication failed" -ForegroundColor Red
        exit 1
    }
}

# Set project
Write-Host "Setting project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to set project. Please check if project exists and you have access." -ForegroundColor Red
    exit 1
}

# Enable required APIs
Write-Host "Enabling required APIs..." -ForegroundColor Yellow
$apis = @("run.googleapis.com", "cloudbuild.googleapis.com")
foreach ($api in $apis) {
    Write-Host "  Enabling $api..." -ForegroundColor Gray
    gcloud services enable $api --quiet
}

# Build and deploy with Always Free tier settings
Write-Host "Building and deploying..." -ForegroundColor Yellow
Write-Host "Using Always Free tier configuration (optimized for ML):" -ForegroundColor Green
Write-Host "  - Memory: 512MB (needed for Python/ML)" -ForegroundColor Green
Write-Host "  - CPU: 1 vCPU (throttled)" -ForegroundColor Green
Write-Host "  - CPU Throttling: Enabled" -ForegroundColor Green
Write-Host "  - Concurrency: 40 (optimized for ML workload)" -ForegroundColor Green

gcloud run deploy $SERVICE_NAME `
    --source . `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --port 8080 `
    --memory 512Mi `
    --cpu 1 `
    --cpu-throttling `
    --concurrency 40 `
    --min-instances 0 `
    --max-instances 5 `
    --set-env-vars "NODE_ENV=production,httpsmsapikey=uk_7vRxSH_ag2ENnEKu81oH7y8sWdiM4ujTZor_OEQPbxbZXcpdNpJQ3Gd1yoXyuvTZ,httpsmsphonenumber=+254703844258" `
    --quiet

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed" -ForegroundColor Red
    exit 1
}

# Get service URL
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format "value(status.url)"

Write-Host ""
Write-Host "Deployment successful!" -ForegroundColor Green
Write-Host "Service URL: $SERVICE_URL" -ForegroundColor Green

Write-Host ""
Write-Host "Cost Analysis (Always Free Tier):" -ForegroundColor Yellow
Write-Host "- Compute: FREE (within 2M requests/month limit)" -ForegroundColor Green
Write-Host "- Memory: FREE (512MB x usage time - still within limits)" -ForegroundColor Green
Write-Host "- Network: FREE (within 1GB/month limit)" -ForegroundColor Green
Write-Host "- TOTAL MONTHLY COST: $0.00 (with moderate usage)" -ForegroundColor Green

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure HttpSMS webhook URL: $SERVICE_URL/api/sms/webhook"
Write-Host "2. Test by sending: MAWINGU MAIZE VOTA to your phone"
Write-Host "3. Monitor usage at: https://console.cloud.google.com/run"