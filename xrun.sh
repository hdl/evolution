#!/usr/bin/env sh

# Authors:
#   Unai Martinez-Corral
#     <unai.martinezcorral@ehu.eus>
#
# Copyright 2021-2026 Unai Martinez-Corral
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# SPDX-License-Identifier: Apache-2.0

set -euo pipefail

OUTPUT_NAME="${GOURCE_REPO:-.}/${GOURCE_NAME:-gource}"

xvfb-run --auto-servernum --server-args="-screen 0, ${GOURCE_RESOLUTION:-1920x1080}x24" \
  gource \
    --key \
    -c 1.25 \
    --highlight-users \
    --highlight-dirs \
    --hide bloom,filenames \
    --hash-seed 9182 \
    --date-format '%Y / %m / %d [%W]' \
    --font-colour aaaaaa \
    --font-size 24 \
    --caption-size 4 \
    --colour-images \
    --output-framerate 60 \
    --dir-name-depth 2 \
    --file-idle-time 0 \
    --max-user-speed 250 \
    --user-friction 0.3 \
    --multi-sampling \
    --frameless \
    -"${GOURCE_RESOLUTION:-1920x1080}" \
    -a "${GOURCE_AUTO_SKIP_SECONDS:-0.05}" \
    -s "${GOURCE_SECONDS_PER_DAY:-0.125}" \
    --title "${GOURCE_TITLE:-Title}" \
    "$@" -o - |
  ffmpeg -y \
    -r 60 \
    -f image2pipe \
    -probesize 100M \
    -vcodec ppm \
    -i - \
    -vcodec libx264 \
    -preset slow \
    -pix_fmt yuv420p \
    -crf 18 \
    -threads 0 \
    -bf 0 \
    "$OUTPUT_NAME".mp4

ffmpeg -sseof -0.5 -i "$OUTPUT_NAME".mp4 -update 1 -q:v 1 "$OUTPUT_NAME".jpg
