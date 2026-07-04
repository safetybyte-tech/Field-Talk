# OSHA 29 CFR Part 1926 corpus

Place the 304 OSHA Part 1926 standard markdown files in this directory (this
README is ignored by the sync script). Each file must have YAML frontmatter:

```markdown
---
citation: "1926.501"
subpart: "M"
subpart_title: "Fall Protection"
industry: "construction"
source_url: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1926/subpart-M/section-1926.501"
official: false
---

(full regulatory text of the section)
```

This text is public-domain but **unofficial** — the product always links back
to `source_url` (eCFR) so citations can be verified against the official CFR.

Load/refresh the database with:

```sh
node --env-file=.env scripts/sync-osha-standards.mjs
```

See `scripts/README-osha-sync.md` for details.
