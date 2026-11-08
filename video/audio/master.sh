#!/usr/bin/env bash
# usage: audio/master.sh <in.wav> <out.wav>  — compress, limit, two-pass loudnorm to -14 LUFS / -1.5 dBTP
set -euo pipefail
PRE="acompressor=threshold=-18dB:ratio=3:attack=5:release=120:makeup=2,alimiter=limit=0.5:attack=3:release=60:level=false"
M=$(ffmpeg -hide_banner -i "$1" -af "$PRE,loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | python3 -c "
import sys,json
t=sys.stdin.read(); d=json.loads(t[t.rindex('{'):t.rindex('}')+1])
print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -v error -y -i "$1" -af "$PRE,loudnorm=I=-14:TP=-1.5:LRA=11:$M:linear=true,aresample=48000" -ac 2 "$2"
