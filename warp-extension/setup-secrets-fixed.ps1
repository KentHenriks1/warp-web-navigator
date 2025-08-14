# Warp Web Navigator - GitHub Secrets Setup Script
# PowerShell script to configure CI/CD secrets automatically

param(
    [Parameter(Mandatory=$true)]
    [string]$RepoOwner,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoName,
    
    [Parameter(Mandatory=$false)]
    [string]$GitHubToken = $env:GITHUB_TOKEN,
    
    [Parameter(Mandatory=$false)]
    [switch]$Interactive = $false
)

# Colors for output
$Red = [System.ConsoleColor]::Red
$Green = [System.ConsoleColor]::Green
$Yellow = [System.ConsoleColor]::Yellow
$Cyan = [System.ConsoleColor]::Cyan

function Write-ColorOutput {
    param([string]$Message, [System.ConsoleColor]$Color = [System.ConsoleColor]::White)
    Write-Host $Message -ForegroundColor $Color
}

function Test-GitHubCLI {
    try {
        gh --version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Install-GitHubCLI {
    Write-ColorOutput "Installing GitHub CLI..." $Yellow
    
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id GitHub.cli
    }
    elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install gh
    }
    elseif (Get-Command scoop -ErrorAction SilentlyContinue) {
        scoop install gh
    }
    else {
        Write-ColorOutput "Please install GitHub CLI manually from: https://cli.github.com/" $Red
        exit 1
    }
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

function Get-SecretValue {
    param([string]$SecretName, [string]$Description, [bool]$Required = $true)
    
    Write-ColorOutput "Key: $SecretName" $Cyan
    Write-ColorOutput "   $Description" $Yellow
    
    if ($Required) {
        do {
            $value = Read-Host "   Enter value (required)"
        } while ([string]::IsNullOrWhiteSpace($value))
    }
    else {
        $value = Read-Host "   Enter value (optional, press Enter to skip)"
    }
    
    return $value
}

function Set-GitHubSecret {
    param([string]$Name, [string]$Value)
    
    if ([string]::IsNullOrWhiteSpace($Value)) {
        Write-ColorOutput "Skipping $Name (empty value)" $Yellow
        return
    }
    
    try {
        gh secret set $Name --body $Value --repo "$RepoOwner/$RepoName"
        Write-ColorOutput "Set secret: $Name" $Green
    }
    catch {
        Write-ColorOutput "Failed to set secret: $Name - $($_.Exception.Message)" $Red
    }
}

# Main script
Write-ColorOutput "Warp Web Navigator - GitHub Secrets Setup" $Cyan
Write-ColorOutput "=================================================" $Cyan

# Check if GitHub CLI is installed
if (-not (Test-GitHubCLI)) {
    Write-ColorOutput "GitHub CLI not found. Installing..." $Yellow
    Install-GitHubCLI
    
    if (-not (Test-GitHubCLI)) {
        Write-ColorOutput "Failed to install GitHub CLI. Please install manually and run this script again." $Red
        exit 1
    }
}

# Check authentication
try {
    gh auth status | Out-Null
}
catch {
    Write-ColorOutput "Please authenticate with GitHub first:" $Yellow
    Write-ColorOutput "   gh auth login" $Cyan
    exit 1
}

Write-ColorOutput "Repository: $RepoOwner/$RepoName" $Green
Write-ColorOutput ""

# Default values for development
$defaultWarpApiKey = "warp_dev_12345abcdef67890ghijklmnopqrstuv"
$defaultWarpEndpoint = "https://api.warp.dev/v1"

if ($Interactive) {
    Write-ColorOutput "Interactive mode - Please provide the following secrets:" $Yellow
    Write-ColorOutput ""
    
    # Get secret values
    $warpApiKey = Get-SecretValue "WARP_API_KEY" "API key for Warp Web Navigator services" $true
    $warpEndpoint = Get-SecretValue "WARP_ENDPOINT" "Warp API endpoint URL (default: https://api.warp.dev/v1)" $false
    $slackWebhook = Get-SecretValue "SLACK_WEBHOOK" "Slack webhook URL for notifications" $false
    $teamsWebhook = Get-SecretValue "TEAMS_WEBHOOK" "Microsoft Teams webhook URL for notifications" $false
}
else {
    Write-ColorOutput "Automatic mode - Setting up development secrets..." $Yellow
    Write-ColorOutput ""
    
    # Use default development values
    $warpApiKey = $defaultWarpApiKey
    $warpEndpoint = $defaultWarpEndpoint
    $slackWebhook = ""
    $teamsWebhook = ""
    
    Write-ColorOutput "Using default development values:" $Yellow
    Write-ColorOutput "   WARP_API_KEY: $warpApiKey" $Yellow
    Write-ColorOutput "   WARP_ENDPOINT: $warpEndpoint" $Yellow
    Write-ColorOutput "   SLACK_WEBHOOK: (not set)" $Yellow
    Write-ColorOutput "   TEAMS_WEBHOOK: (not set)" $Yellow
    Write-ColorOutput ""
    Write-ColorOutput "Run with -Interactive flag to set custom values" $Cyan
    Write-ColorOutput ""
}

# Set secrets
Write-ColorOutput "Setting GitHub secrets..." $Yellow

Set-GitHubSecret "WARP_API_KEY" $warpApiKey
Set-GitHubSecret "WARP_ENDPOINT" $warpEndpoint
Set-GitHubSecret "SLACK_WEBHOOK" $slackWebhook
Set-GitHubSecret "TEAMS_WEBHOOK" $teamsWebhook

Write-ColorOutput ""
Write-ColorOutput "GitHub secrets setup completed!" $Green
Write-ColorOutput ""

# Verify secrets
Write-ColorOutput "Verifying secrets..." $Yellow
try {
    $secrets = gh secret list --repo "$RepoOwner/$RepoName" --json name | ConvertFrom-Json
    $secretNames = $secrets | ForEach-Object { $_.name }
    
    $expectedSecrets = @("WARP_API_KEY", "WARP_ENDPOINT", "SLACK_WEBHOOK", "TEAMS_WEBHOOK")
    foreach ($secret in $expectedSecrets) {
        if ($secretNames -contains $secret) {
            Write-ColorOutput "OK: $secret" $Green
        }
        else {
            Write-ColorOutput "Missing: $secret" $Red
        }
    }
}
catch {
    Write-ColorOutput "Could not verify secrets: $($_.Exception.Message)" $Yellow
}

Write-ColorOutput ""
Write-ColorOutput "Setup Complete!" $Green
Write-ColorOutput ""
Write-ColorOutput "Next steps:" $Cyan
Write-ColorOutput "1. Push your code to trigger the CI/CD pipeline" $White
Write-ColorOutput "2. Check the Actions tab to see the workflow running" $White
Write-ColorOutput "3. Review the ENVIRONMENT_SETUP.md for additional configuration" $White
Write-ColorOutput ""
Write-ColorOutput "For more information, see:" $Cyan
Write-ColorOutput "   - .github/ENVIRONMENT_SETUP.md" $White
Write-ColorOutput "   - .github/workflows/warp-cicd.yml" $White
