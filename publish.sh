#!/bin/sh
# Publishes the Attest site to GitHub Pages under your account. Run it once.
set -e
cd "$(dirname "$0")"
git init -q -b main 2>/dev/null || true
git add -A
git -c user.name="Tommy Newman" -c user.email="tommy_newman@icloud.com" commit -q -m "Attest site: guide, support, privacy policy, terms" || true
gh repo create bytommynewman/attest-site --public --source=. --push \
  --description "Attest - controlled documents for Confluence Cloud: guide, support, privacy, terms"
gh api -X POST repos/bytommynewman/attest-site/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/' >/dev/null
echo "Published. Pages will be live in a minute at: https://bytommynewman.github.io/attest-site/"
