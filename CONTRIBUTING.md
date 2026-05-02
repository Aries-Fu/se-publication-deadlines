# Contributing

Thank you for helping maintain Software Engineering Publication Deadlines.

## Quick Contribution Flow

1. Fork the repository.
2. Edit YAML files under `data/`.
3. Run validation if you can.
4. Open a pull request.

If you do not want to edit YAML, use one of the structured issue forms:

- Add a deadline
- Add a journal
- Correct existing data

Issue form submissions still need maintainer review before they become website data.

## Add a Deadline

Add conference, workshop, and special issue calls under `data/deadlines/`.

Journal metadata belongs under `data/venues/`. A journal should not be added as a deadline record unless the contribution is for a dated special issue.

Rules:

- Use a stable lowercase `id`, such as `icse-2027-research-track`.
- Use an existing `venueId` from `data/venues/`.
- For colocated workshops, use the parent conference `venueId` and set `type: workshop`.
- If the venue does not exist, add it first.
- Put all dates for the same call in one record under `deadlines`.
- Add `source.url` and `source.checkedDate`.
- Use `status: tentative` if a date is not final.

## Add Venue Metadata

Add venue records under `data/venues/`.

Journals are displayed in the website's Journal list. They do not need deadline fields; the frontend shows deadline-specific columns as `N/A`.

Required fields:

- `id`
- `name`
- `shortName`
- `type`
- `website`
- `categories`

Useful optional fields:

- `publisher`
- `ranking.core`
- `ranking.ccf`
- `metrics.impactFactor`
- `metrics.jcrQuartile`
- `metricsYear`
- `notes`

Impact factors must include `metricsYear`.

## Validation

Run:

```bash
npm install
npm run validate:data
npm run build:data
```

Validation checks:

- YAML parsing
- JSON Schema compliance
- Duplicate IDs
- Valid `venueId`
- Date format
- Required source URL
- Known category IDs
- Known ranking values

## DBLP Metadata Suggestions

Maintainers can refresh DBLP venue metadata suggestions with:

```bash
npm run sync:dblp
```

This updates `data/external/dblp-venues.json`. Treat the file as a review aid only. Do not copy suggestions into authoritative YAML data unless the match is clearly correct.

DBLP does not provide submission deadlines. Use official CFP/source pages for deadline updates.

## Source Page Monitoring

Maintainers can refresh source page monitoring output with:

```bash
npm run check:sources
```

Sources are configured in `data/sources.yml`. The output in `data/external/source-pages/` records page hashes and low-confidence deadline-like date candidates.

The weekly `Check source page updates` workflow opens a pull request when source monitoring output changes. This PR is a review aid only; it must not be merged as a substitute for manually updating authoritative YAML deadline data.

## Import Issue Form Drafts

Maintainers can convert a structured issue into a draft file:

```bash
npm run import:issue -- --repo Aries-Fu/se-publication-deadlines --issue ISSUE_NUMBER
```

The manual `Import issue form draft` workflow does the same thing in GitHub Actions and opens a pull request containing the draft under `data/external/issue-imports/`.

After review, copy accepted data into the authoritative YAML files.

## Pull Request Checklist

- The source URL is official or clearly authoritative.
- Dates use `YYYY-MM-DD`.
- Timezone is listed.
- Categories exist in `data/categories.yml`.
- Ranking and impact factor data are not guessed.
- Multiple deadlines for one call are grouped in one record.

## Branch Protection

Maintainers should protect `main`, require pull requests, require the validation workflow, and require CODEOWNERS review for data changes.
