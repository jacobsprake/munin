#!/bin/sh
# Remove "reviewer(s)" from commit titles so no title mentions reviewer
# e.g. reviewer alignment → alignment, reviewer-blocking → blocking, for reviewers → for evaluators
MSG_FILE="$1"
if [ -n "$MSG_FILE" ] && [ -f "$MSG_FILE" ]; then
  sed -i.bak \
    -e 's/reviewer-//g' \
    -e 's/reviewer //g' \
    -e 's/ reviewers//g' \
    -e 's/for reviewers/for evaluators/g' \
    "$MSG_FILE"
  rm -f "${MSG_FILE}.bak"
fi
