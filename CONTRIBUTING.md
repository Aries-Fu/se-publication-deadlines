# Contributing

Thank you for helping maintain Software Engineering Publication Deadlines.

## Quick Contribution Flow

1. Fork the repository.
2. Edit YAML files under `data/`.
3. Run validation if you can.
4. Open a pull request.

## Add a Deadline

Add conference and special issue calls under `data/deadlines/`.

Journal metadata belongs under `data/venues/`. A journal should not be added as a deadline record unless the contribution is for a dated special issue.

Rules:

- Use a stable lowercase `id`, such as `icse-2027-research-track`.
- Use an existing `venueId` from `data/venues/`.
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

## Pull Request Checklist

- The source URL is official or clearly authoritative.
- Dates use `YYYY-MM-DD`.
- Timezone is listed.
- Categories exist in `data/categories.yml`.
- Ranking and impact factor data are not guessed.
- Multiple deadlines for one call are grouped in one record.

## Branch Protection

Maintainers should protect `main`, require pull requests, require the validation workflow, and require CODEOWNERS review for data changes.
