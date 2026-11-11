#!/usr/bin/env python3
#
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

from os import environ
from pathlib import Path
from subprocess import check_call
from datetime import datetime, timezone
from json import loads as json_loads, dump as json_dump

LogDir = Path('/tmp/glogs').resolve()
job = json_loads(environ['HDLE_JOB'])

events = [
  f'{(p := line.rpartition("|"))[0]}|/{loc}{p[2]}' if loc else line
  for repo, loc in job['tree'].items()
  for line in (LogDir / f"{repo.replace('/','--')}.log").read_text(encoding='utf-8', errors='replace').splitlines()
]

if not events:
  raise ValueError('Empty combined log!')

events.sort(key=lambda line: (
  (lambda pos: int(pos) if pos.isdigit() else 0)(line.partition('|')[0]),
  line
))

(LogDir.parent / 'combined.log').write_text('\n'.join(
  [events[0].split('|', 1)[0] + '|Gource|A|/.root'] + events + ['']
), encoding='utf-8')

check_call([
  "docker",
  "run",
  "--rm",
  "-v",
  f"{LogDir.parent!s}:/wrk",
  "-w",
  "/wrk",
  "-e", f"GOURCE_TITLE={job['title']}",
  "-e", f"GOURCE_NAME={job['name']}",
  "ghcr.io/umarcor/gource/xrun",
  "/xrun.sh",
] + (job['args'] if 'args' in job else []) + [
  "combined.log"
])

job |= {
  'repositories': len(job['tree']),
  'first': datetime.fromtimestamp(int(events[0].partition('|')[0]), tz=timezone.utc).strftime('%Y/%m'),
  'last': datetime.fromtimestamp(int(events[-1].partition('|')[0]), tz=timezone.utc).strftime('%Y/%m'),
  'contributors': len({line.split('|')[1] for line in events}),
  'changes': len(events),
}

with (LogDir.parent / (job['name'] + '.json')).open('w', encoding='utf-8') as fptr:
  json_dump(job, fptr)

with open(environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as gho:
  gho.write('name=' + job['name'] + '\nartifacts<<EOF\n' + '\n'.join([
    str(LogDir.parent / f'{job["name"]}.{ext}') for ext in ['mp4', 'jpg', 'json']
  ]) + '\nEOF\n')
