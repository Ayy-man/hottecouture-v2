#!/bin/bash
export GIT_ASKPASS=
export SSH_ASKPASS=
export GIT_TERMINAL_PROMPT=0
export GIT_EDITOR=true

cd /Users/aymanbaig/Desktop/hottecouture-main
rm -f .git/index.lock .git/*.lock 2>/dev/null

git add -A
git commit -m "fix: consolidate design system to CSS variables"
git push

echo "DONE"
