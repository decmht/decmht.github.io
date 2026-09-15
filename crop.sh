#!/usr/bin/env bash
# Trim the first 1 second off a video and save as <name>_cropped.<ext>
# Usage: ./crop.sh filename.mp4

set -euo pipefail

TRIM_SECONDS=1

if [ $# -lt 1 ]; then
    echo "Usage: $0 <input_file>" >&2
    exit 1
fi

input="$1"

if [ ! -f "$input" ]; then
    echo "Error: file '$input' not found" >&2
    exit 1
fi

for bin in ffmpeg ffprobe; do
    if ! command -v "$bin" >/dev/null 2>&1; then
        echo "Error: '$bin' is required but not installed" >&2
        exit 1
    fi
done

dir=$(dirname -- "$input")
base=$(basename -- "$input")
name="${base%.*}"
ext="${base##*.}"
output="${dir}/${name}_cropped.${ext}"

duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$input")
target_duration=$(awk -v d="$duration" -v t="$TRIM_SECONDS" 'BEGIN { r = d - t; if (r < 0) r = 0; printf "%.3f", r }')

echo "Input:  $input (${duration}s)"
echo "Output: $output (trimming first ${TRIM_SECONDS}s, ~${target_duration}s remaining)"
echo

ffmpeg -y -i "$input" -ss "$TRIM_SECONDS" -c:v libx264 -preset fast -crf 18 -c:a aac \
    -progress pipe:1 -nostats -loglevel error "$output" | while IFS='=' read -r key value; do
    case "$key" in
        out_time_ms)
            current=$(awk -v ms="$value" 'BEGIN { printf "%.3f", ms / 1000000 }')
            percent=$(awk -v c="$current" -v t="$target_duration" 'BEGIN {
                if (t <= 0) { print 0 } else {
                    p = (c / t) * 100
                    if (p > 100) p = 100
                    printf "%.1f", p
                }
            }')
            printf "\rProgress: %6s%% (%.1fs / %.1fs)" "$percent" "$current" "$target_duration"
            ;;
        progress)
            if [ "$value" = "end" ]; then
                printf "\rProgress: 100.0%% (%.1fs / %.1fs)\n" "$target_duration" "$target_duration"
            fi
            ;;
    esac
done

echo "Done: $output"
