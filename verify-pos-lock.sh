#!/bin/bash
# Verify SHA256 lock for ALL Ordy POS files
# Run: bash verify-pos-lock.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "═══════════════════════════════════════════"
echo "  ORDY POS — SHA256 Lock Verification"
echo "═══════════════════════════════════════════"
echo ""

CHANGED=0
TOTAL=0

while IFS='  ' read -r expected_hash filepath; do
  TOTAL=$((TOTAL + 1))
  if [ ! -f "$filepath" ]; then
    echo -e "  ${RED}MISSING${NC}  $filepath"
    CHANGED=$((CHANGED + 1))
    continue
  fi
  actual_hash=$(shasum -a 256 "$filepath" | awk '{print $1}')
  if [ "$expected_hash" = "$actual_hash" ]; then
    echo -e "  ${GREEN}OK${NC}       $filepath"
  else
    echo -e "  ${RED}CHANGED${NC}  $filepath"
    CHANGED=$((CHANGED + 1))
  fi
done < pos-flow-lock.sha256

echo ""
echo "═══════════════════════════════════════════"
if [ $CHANGED -eq 0 ]; then
  echo -e "  ${GREEN}ALL $TOTAL FILES VERIFIED — NO CHANGES${NC}"
else
  echo -e "  ${YELLOW}$CHANGED/$TOTAL FILES CHANGED${NC}"
  echo -e "  ${RED}LOCK BROKEN — Review changes before deploy${NC}"
fi
echo "═══════════════════════════════════════════"
exit $CHANGED
