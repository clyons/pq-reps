# Usage:
#   ./scripts/logs.sh                 # default service, last 2h
#   ./scripts/logs.sh 6h              # last 6h
#   ./scripts/logs.sh 2h pq-reps      # last 2h, service pq-reps
#   ./scripts/logs.sh 2h pq-reps pq-reps-00012-flt  # also pin to a revision

FRESHNESS="${1:-2h}"
SERVICE="${2:-pq-reps}"
REVISION="${3:-}"

PROJECT="${PROJECT:-pq-reps}"

FILTER='resource.type="cloud_run_revision"'
FILTER="$FILTER resource.labels.service_name=\"$SERVICE\""
if [[ -n "$REVISION" ]]; then
  FILTER="$FILTER resource.labels.revision_name=\"$REVISION\""
fi

gcloud logging read \
  --project "$PROJECT" \
  --freshness="$FRESHNESS" \
  --limit=500 \
  "$FILTER" \
  --format=json \
| jq -r '
  reverse[]
  | (
      if (.jsonPayload? != null) then (.jsonPayload | tojson)
      elif (.textPayload? != null) then .textPayload
      else empty
      end
    )
  | select(. != "" and . != "null")
'