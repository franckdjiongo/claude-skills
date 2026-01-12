#!/bin/bash
# Script to create a GitHub issue using the GitHub REST API
# Usage: ./create_issue.sh <repo> <title> <body> [labels] [assignees]

set -e

# Check if required arguments are provided
if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <repo> <title> <body> [labels] [assignees]"
    echo ""
    echo "Arguments:"
    echo "  repo       - Repository in format 'owner/repo' (e.g., 'octocat/Hello-World')"
    echo "  title      - Issue title"
    echo "  body       - Issue body/description"
    echo "  labels     - (Optional) Comma-separated labels (e.g., 'bug,urgent')"
    echo "  assignees  - (Optional) Comma-separated GitHub usernames (e.g., 'user1,user2')"
    echo ""
    echo "Environment variable required:"
    echo "  GITHUB_TOKEN - Your GitHub personal access token"
    exit 1
fi

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN environment variable is not set"
    echo "Please set it with: export GITHUB_TOKEN='your_token_here'"
    exit 1
fi

# Parse arguments
REPO="$1"
TITLE="$2"
BODY="$3"
LABELS="${4:-}"
ASSIGNEES="${5:-}"

# Build JSON payload
JSON_PAYLOAD=$(jq -n \
    --arg title "$TITLE" \
    --arg body "$BODY" \
    '{title: $title, body: $body}')

# Add labels if provided
if [ -n "$LABELS" ]; then
    IFS=',' read -ra LABEL_ARRAY <<< "$LABELS"
    LABELS_JSON=$(printf '%s\n' "${LABEL_ARRAY[@]}" | jq -R . | jq -s .)
    JSON_PAYLOAD=$(echo "$JSON_PAYLOAD" | jq --argjson labels "$LABELS_JSON" '. + {labels: $labels}')
fi

# Add assignees if provided
if [ -n "$ASSIGNEES" ]; then
    IFS=',' read -ra ASSIGNEE_ARRAY <<< "$ASSIGNEES"
    ASSIGNEES_JSON=$(printf '%s\n' "${ASSIGNEE_ARRAY[@]}" | jq -R . | jq -s .)
    JSON_PAYLOAD=$(echo "$JSON_PAYLOAD" | jq --argjson assignees "$ASSIGNEES_JSON" '. + {assignees: $assignees}')
fi

# Make API request
RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "https://api.github.com/repos/$REPO/issues" \
    -d "$JSON_PAYLOAD")

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# Extract response body (all but last line)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

# Check if request was successful
if [ "$HTTP_CODE" -eq 201 ]; then
    ISSUE_URL=$(echo "$RESPONSE_BODY" | jq -r '.html_url')
    ISSUE_NUMBER=$(echo "$RESPONSE_BODY" | jq -r '.number')
    echo "✅ Issue created successfully!"
    echo "Issue #$ISSUE_NUMBER: $ISSUE_URL"
else
    echo "❌ Failed to create issue (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi
