# Pre-public checklist — before The Bridge repo goes open

The biggest risk isn't the current files — it's **git history**. A real number, a client name, or the anonymization map committed weeks ago and deleted later is still sitting in history, and flipping a repo public exposes all of it at once. Handle that first.

---

## The safest path: publish from a clean snapshot (recommended)

Given how fast this repo has moved alongside other client matters, don't try to scrub a messy history — **start the public history fresh from a clean tree.** Old private history never becomes public, so nothing historical can leak.

```bash
# from a COPY of the working tree, scoped to The Bridge only:
rm -rf .git                      # drop all prior history
git init
git add -A
git commit -m "The Bridge — initial public release"
git branch -M main
git remote add origin https://github.com/<you>/the-bridge.git
git push -u origin main          # this repo has no prior history to leak
```

Create the public repo as **new and empty** on GitHub; push the clean tree to it. Do **not** flip an existing private repo to public unless you've completed the in-place scrub below and accept that anything ever pushed to the old remote could already be cached.

---

## If you must preserve history (in-place scrub)

Only if there's a real reason to keep the commit log. Scan, scrub, then force-push — and treat anything previously pushed as potentially already exposed.

```bash
# scrub identified secrets/strings out of all history, then force-push
pip install git-filter-repo
git filter-repo --replace-text replacements.txt   # one find=>replace per line
git push --force --all
```

---

## Verification scans — run these regardless of path

```bash
# 1) Every file ever added across all history — eyeball for anything that shouldn't ship
git log --all --diff-filter=A --name-only --pretty=format: | sort -u

# 2) Every CSV ever committed — confirm ONLY synthetic MOCK_RAD_GROUP / PUBLIC_MPFS files
git log --all --name-only --pretty=format: | grep -i '\.csv$' | sort -u

# 3) Search ALL commits for sensitive strings (edit the pattern list)
git grep -n -i -E 'MSIT|Mid-South|Memphis|Brian|Saenz|Patel|anonymization|[0-9]{9}|62-1' $(git rev-list --all)
#   patterns to include: real client/group names, real people, real NPIs (9 digits),
#   real TINs, "anonymization map", and any real dollar figures you recognize.

# 4) Secret scan over full history (pick one)
gitleaks detect --source . --log-opts="--all"
#   or: trufflehog git file://. 

# 5) No env files / keys / tokens tracked (should print nothing)
git ls-files | grep -iE '\.env|secret|api[_-]?key|token|credential'
```

If 3, 4, or 5 turn up anything real, go back to the clean-snapshot path — it's faster and safer than chasing it through history.

---

## Content gates — confirm before the repo is public

- [ ] **Scope:** repo is The Bridge only — engine, harness, synthetic data, site copy. No other ventures, no client-identifiable material, no anonymization map, no real or valuator numbers.
- [ ] **Synthetic only:** the only datasets are `MOCK_RAD_GROUP_*` and `MOCK_PUBLIC_MPFS_*`. No real extracts anywhere.
- [ ] **README** at root, with the guardrails ported in (not-advice / engage counsel + a valuator / binding figures are the valuator's / contains no patient data).
- [ ] **LICENSE** = Apache-2.0. Use GitHub's "Add license → Apache License 2.0" to insert the canonical text (don't hand-type it). Swap to MIT later if you prefer — one file.
- [ ] **NOTICE** present at root.
- [ ] **Per-file header** on the engine/harness/calculator source files (snippet below).
- [ ] `.gitignore` covers `*.env`, secrets, and any real-data directory.
- [ ] The disclaimer lives **in the repo**, not only on the website — cloning must not strip the warnings.

---

## Per-file header snippet (top of source files)

```
/*
 * The Bridge — illustrative reference implementation.
 * Copyright 2026 Taylor C. Berger / TCB Consulting. Apache-2.0 (see LICENSE / NOTICE).
 * Not legal, financial, or valuation advice. Binding FMV figures belong to an
 * independent valuator; the legal structure belongs to your counsel. No patient data.
 */
```

---

Once the gates are checked and the scans are clean, push the clean snapshot and make the repo public. Then drop the **Source →** link into the site footer, `/harness`, and `/for-it` (per the build adjustments in the four-doors doc).
