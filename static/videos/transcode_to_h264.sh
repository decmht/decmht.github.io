#!/usr/bin/env bash
# Re-encode any HEVC (H.265) videos in this folder to H.264, which Chrome/Firefox
# can decode natively (HEVC in <video> only works reliably in Safari).
# Downscales to a max width of 1280px (videos are muted/looping previews, so
# 720p keeps files small without a visible quality hit) and strips audio if
# the file doesn't already carry a meaningful track.
#
# Usage: ./transcode_to_h264.sh [max_width]

set -euo pipefail

MAX_WIDTH="${1:-1280}"

for bin in ffmpeg ffprobe; do
    if ! command -v "$bin" >/dev/null 2>&1; then
        echo "Error: '$bin' is required but not installed" >&2
        exit 1
    fi
done

shopt -s nullglob
for input in *.mp4; do
    codec=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name \
        -of default=noprint_wrappers=1:nokey=1 "$input")

    if [ "$codec" != "hevc" ]; then
        echo "Skip (already $codec): $input"
        continue
    fi

    has_audio=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name \
        -of default=noprint_wrappers=1:nokey=1 "$input")

    tmp_output="${input%.mp4}.h264.mp4"

    echo "Transcoding: $input (hevc -> h264, max width ${MAX_WIDTH}px)"

    if [ -n "$has_audio" ]; then
        ffmpeg -y -i "$input" -vf "scale='min(${MAX_WIDTH},iw)':-2" \
            -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
            -c:a aac -b:a 128k -movflags +faststart \
            -loglevel error -stats "$tmp_output"
    else
        ffmpeg -y -i "$input" -vf "scale='min(${MAX_WIDTH},iw)':-2" \
            -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p \
            -an -movflags +faststart \
            -loglevel error -stats "$tmp_output"
    fi

    before=$(du -h "$input" | cut -f1)
    after=$(du -h "$tmp_output" | cut -f1)
    mv -f "$tmp_output" "$input"
    echo "Done: $input ($before -> $after)"
    echo
done
