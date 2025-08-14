# Warp Web Navigator - Environment Configuration

This document describes the required environment variables and secrets for the CI/CD pipeline.

## GitHub Secrets Configuration

To set up the CI/CD pipeline, you need to configure the following secrets in your GitHub repository:

### 1. Navigate to Repository Settings
Go to: `Settings > Secrets and variables > Actions`

### 2. Add Repository Secrets

Click "New repository secret" and add each of the following:

#### WARP_API_KEY
- **Name**: `WARP_API_KEY`
- **Value**: `warp_dev_12345abcdef67890ghijklmnopqrstuv`
- **Description**: API key for Warp Web Navigator services

#### WARP_ENDPOINT (Optional)
- **Name**: `WARP_ENDPOINT`
- **Value**: `https://api.warp.dev/v1`
- **Description**: Warp API endpoint URL (defaults to production if not set)

#### SLACK_WEBHOOK (Optional)
- **Name**: `SLACK_WEBHOOK`
- **Value**: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`
- **Description**: Slack webhook URL for CI/CD notifications

#### TEAMS_WEBHOOK (Optional)
- **Name**: `TEAMS_WEBHOOK`
- **Value**: `https://outlook.office.com/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx@xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/IncomingWebhook/yyyyyyyyyyyyyyyyyyyyyyyy/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Description**: Microsoft Teams webhook URL for CI/CD notifications

## Local Development Configuration

For local development and testing, create a `.env` file in the project root:

```bash
# .env file (DO NOT commit this file)
WARP_API_KEY=warp_dev_12345abcdef67890ghijklmnopqrstuv
WARP_ENDPOINT=https://api.warp.dev/v1
SLACK_WEBHOOK=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
TEAMS_WEBHOOK=https://outlook.office.com/webhook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx@xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/IncomingWebhook/yyyyyyyyyyyyyyyyyyyyyyyy/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## How to Obtain These Values

### Warp API Key
1. Sign up at https://warp.dev/developers
2. Create a new project
3. Generate an API key from the dashboard
4. Copy the key (format: `warp_dev_...` or `warp_prod_...`)

### Slack Webhook
1. Go to https://api.slack.com/apps
2. Create a new Slack app or select existing
3. Go to "Incoming Webhooks" and activate
4. Add webhook to workspace
5. Copy the webhook URL

### Microsoft Teams Webhook
1. In your Teams channel, click "..." > "Connectors"
2. Find "Incoming Webhook" and click "Configure"
3. Name your webhook (e.g., "Warp CI/CD")
4. Upload an image (optional)
5. Copy the webhook URL

## Security Best Practices

- ✅ Never commit secrets to version control
- ✅ Use GitHub secrets for CI/CD variables
- ✅ Rotate API keys regularly (quarterly recommended)
- ✅ Use environment-specific keys (dev/staging/prod)
- ✅ Monitor webhook usage for suspicious activity
- ✅ Add `.env` to `.gitignore`

## Verification

After setting up secrets, you can verify the configuration by:

1. **Manual workflow trigger**: Go to Actions tab and trigger the workflow manually
2. **Check workflow logs**: Ensure secrets are loaded (they appear as `***`)
3. **Test notifications**: Verify Slack/Teams messages are sent
4. **API connectivity**: Check if Warp API calls succeed

## Troubleshooting

### Common Issues

**Secret not found**
```
Error: Secret WARP_API_KEY not found
```
- Verify secret name matches exactly (case-sensitive)
- Check if secret is set at repository level, not organization level

**API Authentication Failed**
```
Error: 401 Unauthorized
```
- Verify API key is correct and not expired
- Check if API key has necessary permissions

**Webhook Failed**
```
Error: Webhook delivery failed
```
- Verify webhook URL is correct and active
- Check if webhook has necessary permissions in Slack/Teams

**Environment Variable Not Set**
```
Error: WARP_ENDPOINT is not defined
```
- Ensure all required secrets are configured
- Check workflow file environment variable references

For additional support, contact the Warp development team or check the documentation at https://docs.warp.dev
