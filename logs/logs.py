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
from subprocess import check_call
from pathlib import Path
import yaml
from json import dumps as json_dumps

with open(environ['HDLE_CONFIG'], 'r') as fptr:
  config = yaml.load(fptr, Loader=yaml.FullLoader)

jobs = [{'name': task, **config[task]} for task in environ.get('HDLE_TASKS', '').split() or config]

mailmap = Path(environ['HDLE_MAILMAP']).read_text().splitlines() if environ.get('HDLE_MAILMAP') else []

with open(environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as gho:
  gho.write('jobs=' + json_dumps(jobs))

LogDir = Path('/tmp/glogs').resolve()
LogDir.mkdir(exist_ok=True)

all_authors = set()

for repo in {repo for item in jobs for repo in item['tree']}:
  idx = f"{repo.replace('/','--')}"
  repo_dir = Path(idx)
  check_call(['git', 'clone', f'https://{repo}', idx])
  if mailmap:
    (repo_dir / '.mailmap').write_text('\n'.join(mailmap)+'\n')
  authors = LogDir / f'{idx}.authors'
  check_call(f'git log --pretty="%an <%ae>" | sort -u > {authors}', shell=True, cwd=repo_dir)
  all_authors.update(authors.read_text(encoding='utf-8', errors='replace').splitlines())
  check_call(['gource', '--output-custom-log', str(LogDir / f'{idx}.log'), idx])

(LogDir / 'authors.mails').write_text('\n'.join(sorted(all_authors))+'\n')
for authors in LogDir.glob('*.authors'):
    authors.unlink()
