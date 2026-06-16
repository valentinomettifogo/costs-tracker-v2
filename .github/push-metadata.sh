#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
METADATA_FILE="$SCRIPT_DIR/repository-metadata.yml"

if [[ ! -f "$METADATA_FILE" ]]; then
  echo "Error: $METADATA_FILE not found" >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
echo "Updating: $REPO"

read_field() {
  grep "^$1:" "$METADATA_FILE" | head -1 | sed "s/^$1: *//" | tr -d '"'
}

description=$(read_field "description")
homepage=$(read_field "homepage")
visibility=$(read_field "visibility")

args=()
[[ -n "$description" ]] && args+=(--description "$description")
[[ -n "$homepage" ]]    && args+=(--homepage "$homepage")
[[ "$visibility" == "public"  ]] && args+=(--visibility public  --accept-visibility-change-consequences)
[[ "$visibility" == "private" ]] && args+=(--visibility private --accept-visibility-change-consequences)

if [[ ${#args[@]} -gt 0 ]]; then
  gh repo edit "${args[@]}"
  echo "✓ description / homepage / visibility updated"
fi

# Parse topics block
topics=()
in_topics=false
while IFS= read -r line; do
  if [[ "$line" =~ ^topics: ]]; then
    in_topics=true
    continue
  fi
  if $in_topics; then
    if [[ "$line" =~ ^[[:space:]]+-[[:space:]]+(.*) ]]; then
      topic="${BASH_REMATCH[1]}"
      topics+=("${topic//\"/}")
    elif [[ "$line" =~ ^[^[:space:]] ]]; then
      in_topics=false
    fi
  fi
done < "$METADATA_FILE"

if [[ ${#topics[@]} -gt 0 ]]; then
  topics_json=$(printf '%s\n' "${topics[@]}" | jq -R . | jq -sc .)
  echo "{\"names\": $topics_json}" | gh api "repos/$REPO/topics" \
    --method PUT \
    --header "Accept: application/vnd.github.mercy-preview+json" \
    --input -
  echo "✓ topics updated: ${topics[*]}"
fi

echo ""
echo "Done → https://github.com/$REPO"
