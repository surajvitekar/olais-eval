#!/bin/bash
# Olais Eval — Registration Monitor
# Queries the production DB for new candidate registrations.
# Reports only when there's a change. Silent if nothing new.
# State tracking via /tmp/olais_reg_state.txt

DB_CONTAINER="olais-eval-db"
STATE_FILE="/tmp/olais_reg_state.txt"

query() {
  docker exec "$DB_CONTAINER" psql -U olais -d olais_eval -t -A "$@" 2>/dev/null | tr -d '[:space:]'
}

# Current snapshot
TOTAL=$(query -c "SELECT COUNT(*) FROM \"user\" WHERE role = 'CANDIDATE' AND email != 'surajvitekar@gmail.com';")
REGISTERED=$(query -c "SELECT COUNT(*) FROM \"user\" WHERE role = 'CANDIDATE' AND status = 'REGISTERED';")
ASSIGNED=$(query -c "SELECT COUNT(*) FROM \"user\" WHERE role = 'CANDIDATE' AND status = 'PROBLEM_ASSIGNED';")
SUBMITTED=$(query -c "SELECT COUNT(*) FROM \"user\" WHERE role = 'CANDIDATE' AND status = 'SUBMITTED';")
INVITES_USED=$(query -c "SELECT COUNT(*) FROM invite WHERE \"usedCount\" > 0;")
INVITES_TOTAL=$(query -c "SELECT COUNT(*) FROM invite;")

# Read previous state
PREV_TOTAL=0
PREV_INVITED=0
if [ -f "$STATE_FILE" ]; then
  source "$STATE_FILE"
fi

NEW_REGS=$(( TOTAL - PREV_TOTAL ))
NEW_INV=$(( INVITES_USED - PREV_INVITED ))

# Save current state
echo "PREV_TOTAL=$TOTAL" > "$STATE_FILE"
echo "PREV_INVITED=$INVITES_USED" >> "$STATE_FILE"

# Silent exit if nothing changed
if [ "$NEW_REGS" -eq 0 ] && [ "$NEW_INV" -eq 0 ]; then
  exit 0
fi

# Build report
REPORT=""
if [ "$NEW_REGS" -gt 0 ]; then
  NEW_USERS=$(docker exec "$DB_CONTAINER" psql -U olais -d olais_eval -t -A -F' | ' \
    -c "SELECT name, email, status, \"createdAt\"::date FROM \"user\" WHERE role = 'CANDIDATE' AND email != 'surajvitekar@gmail.com' ORDER BY \"createdAt\" DESC LIMIT $NEW_REGS;" 2>/dev/null)
  REPORT+="🆕 $NEW_REGS new registration(s)\n"
  REPORT+="$NEW_USERS\n"
fi

if [ "$NEW_INV" -gt 0 ]; then
  # Get which invites were just used
  NEW_INVITEES=$(docker exec "$DB_CONTAINER" psql -U olais -d olais_eval -t -A -F' | ' \
    -c "SELECT \"candidateName\", \"candidateEmail\" FROM invite WHERE \"usedCount\" > 0 ORDER BY id DESC LIMIT $NEW_INV;" 2>/dev/null)
  REPORT+="📨 $NEW_INV new invite(s) activated\n"
  REPORT+="$NEW_INVITEES\n"
fi

# Summary inline
PCT=$(( INVITES_USED * 100 / INVITES_TOTAL ))
REPORT+="──\n"
REPORT+="📊 $TOTAL candidates ● $REGISTERED waiting ● $ASSIGNED assigned ● $SUBMITTED submitted"
REPORT+=" ● 📨 $INVITES_USED/$INVITES_TOTAL ($PCT%) invites used"

echo -e "$REPORT"
