#!/bin/bash
# ORDY POS - Flow Integrity Verifier
# Run: bash verify-flow-lock.sh
# Exit code 0 = all good, 1 = tampered

set -e
cd "$(dirname "$0")"

LOCK="flow-lock.sha256"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
FAIL=0
CHECKED=0

echo ""
echo "================================================"
echo "  ORDY POS - Flow Integrity Check (SHA-256)"
echo "================================================"
echo ""

while IFS= read -r line; do
  # Skip comments and empty lines
  [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue

  EXPECTED_HASH=$(echo "$line" | awk '{print $1}')
  FILE_PATH=$(echo "$line" | awk '{print $2}')

  if [ ! -f "$FILE_PATH" ]; then
    echo -e "  ${RED}MISSING${NC}  $FILE_PATH"
    FAIL=1
    CHECKED=$((CHECKED + 1))
    continue
  fi

  ACTUAL_HASH=$(shasum -a 256 "$FILE_PATH" | awk '{print $1}')
  CHECKED=$((CHECKED + 1))

  if [ "$EXPECTED_HASH" = "$ACTUAL_HASH" ]; then
    echo -e "  ${GREEN}OK${NC}       $FILE_PATH"
  else
    echo -e "  ${RED}CHANGED${NC}  $FILE_PATH"
    echo -e "           Expected: ${YELLOW}${EXPECTED_HASH:0:16}...${NC}"
    echo -e "           Actual:   ${RED}${ACTUAL_HASH:0:16}...${NC}"
    FAIL=1
  fi
done < "$LOCK"

echo ""
echo "------------------------------------------------"
echo "  Checked: $CHECKED files"

if [ $FAIL -eq 0 ]; then
  echo -e "  Result:  ${GREEN}ALL INTACT - Flow is locked${NC}"
  echo "------------------------------------------------"
  echo ""
  exit 0
else
  echo -e "  Result:  ${RED}INTEGRITY VIOLATION DETECTED${NC}"
  echo -e "  ${YELLOW}Check FLOW-CODEMAP.md for diagnostics${NC}"
  echo "------------------------------------------------"
  echo ""
  exit 1
fi
