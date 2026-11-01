#!/usr/bin/env bash
#
# check-node-lts-security.sh
# Automated security assessment for node:lts-slim Docker images
# Queries Docker Hub API and displays security-relevant information
#
# Requirements: curl, jq
# Usage: ./scripts/check-node-lts-security.sh [tag-pattern]
#   tag-pattern: grep pattern to filter tags (default: "lts-")

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
TAG_PATTERN="${1:-lts-}"
REPO="library/node"
API_BASE="https://hub.docker.com/v2"

# Check dependencies
command -v curl >/dev/null 2>&1 || { echo -e "${RED}Error: curl is required but not installed.${NC}" >&2; exit 1; }
command -v jq >/dev/null 2>&1 || { echo -e "${RED}Error: jq is required but not installed.${NC}" >&2; echo -e "${YELLOW}Install with: brew install jq${NC}" >&2; exit 1; }

echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Docker Hub Security Assessment: node:${TAG_PATTERN}*              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fetch tags from Docker Hub API
echo -e "${BLUE}Fetching tag information from Docker Hub...${NC}"
API_URL="${API_BASE}/repositories/${REPO}/tags/?name=${TAG_PATTERN}&page_size=100&ordering=last_updated"

HTTP_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}")
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HTTP_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}Error: Docker Hub API returned HTTP ${HTTP_CODE}${NC}"
    echo -e "${YELLOW}Response: ${RESPONSE_BODY}${NC}"
    exit 1
fi

# Parse and display results
TAG_COUNT=$(echo "$RESPONSE_BODY" | jq -r '.count // 0')

if [ "$TAG_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}No tags found matching pattern: ${TAG_PATTERN}${NC}"
    exit 0
fi

echo -e "${GREEN}Found ${TAG_COUNT} tags matching '${TAG_PATTERN}'${NC}"
echo ""

# Display each tag with security info
echo "$RESPONSE_BODY" | jq -c '.results[]' | while IFS= read -r tag_data; do
    TAG_NAME=$(echo "$tag_data" | jq -r '.name')
    FULL_SIZE=$(echo "$tag_data" | jq -r '.full_size // 0')
    LAST_UPDATED=$(echo "$tag_data" | jq -r '.last_updated')
    DIGEST=$(echo "$tag_data" | jq -r '.digest // "N/A"')
    
    # Convert bytes to human-readable MB
    SIZE_MB=$(echo "scale=2; ${FULL_SIZE} / 1048576" | bc 2>/dev/null || echo "N/A")
    
    # Check if this is a slim variant
    IS_SLIM=$(echo "$TAG_NAME" | grep -c "slim" || true)
    
    # Determine tag type and color
    if [ "$IS_SLIM" -gt 0 ]; then
        TAG_COLOR="${GREEN}"
        TAG_TYPE="[SLIM]"
    else
        TAG_COLOR="${YELLOW}"
        TAG_TYPE="[FULL]"
    fi
    
    echo -e "${TAG_COLOR}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${TAG_COLOR}Tag: ${TAG_NAME} ${TAG_TYPE}${NC}"
    echo -e "${TAG_COLOR}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${BLUE}Last Updated:${NC}  $(date -j -f '%Y-%m-%dT%H:%M:%S' "${LAST_UPDATED%%.*}" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "$LAST_UPDATED")"
    echo -e "  ${BLUE}Image Size:${NC}    ${SIZE_MB} MB"
    echo -e "  ${BLUE}Digest:${NC}        ${DIGEST:0:19}...${DIGEST: -12}"
    
    # Check for security scan results (if available in API)
    VULN_STATUS=$(echo "$tag_data" | jq -r '.vulnerabilities // empty' 2>/dev/null || echo "")
    if [ -n "$VULN_STATUS" ] && [ "$VULN_STATUS" != "null" ]; then
        echo -e "  ${BLUE}Vulnerabilities:${NC} ${VULN_STATUS}"
    fi
    
    echo ""
done

# Summary and recommendations
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Security Recommendations                                        ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get the most recent slim tag
LATEST_SLIM=$(echo "$RESPONSE_BODY" | jq -r '.results[] | select(.name | contains("slim")) | .name' | head -n1)

if [ -n "$LATEST_SLIM" ]; then
    echo -e "${GREEN}✓ Recommended tag: node:${LATEST_SLIM}${NC}"
    echo -e "  - Smaller attack surface (minimal packages)"
    echo -e "  - Reduced image size (~50-70MB smaller)"
    echo -e "  - LTS security backports for 30 months"
else
    echo -e "${YELLOW}⚠ No slim variants found in the results${NC}"
fi

echo ""
echo -e "${BLUE}For detailed vulnerability scanning, consider:${NC}"
echo -e "  - docker scout cves <image>"
echo -e "  - trivy image <image>"
echo -e "  - snyk container test <image>"
echo ""

# Offer to open Docker Hub in browser
echo -e "${CYAN}Open Docker Hub for manual inspection?${NC}"
echo -e "  ${YELLOW}https://hub.docker.com/_/node/tags?name=${TAG_PATTERN}${NC}"
echo ""
