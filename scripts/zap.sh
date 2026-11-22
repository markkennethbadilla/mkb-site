#!/usr/bin/env bash
# DEKIT-BYPASS-OK: a one-off scan container, removed when the scan ends; not a dev stack
set -euo pipefail
port="$1"
host="$(ip route show default | awk '{print $3}')"
out="$(pwd)/test-runs/zap"
mkdir -p "$out"
chmod 777 "$out"
cp zap.conf "$out/zap.conf"
echo "START zap baseline http://$host:$port"
docker ps -aq -f name=mkb-site-zap | xargs -r docker rm -f
id="$(docker run -d --network host --name mkb-site-zap -v "$out:/zap/wrk:rw" zaproxy/zap-stable:2.17.0 \
  zap-baseline.py -t "http://$host:$port" -m 1 -c zap.conf -r report.html -J report.json)"
code="$(docker wait "$id")"
docker logs "$id" 2>&1 | tail -n 80
docker rm "$id"
if [ "$code" = "0" ]; then echo "OK zap baseline clean"; else echo "FAIL zap baseline exit=$code"; fi
exit "$code"
