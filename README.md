# Software Engineering Publication Deadlines

A community-maintained tracker for software engineering conferences, journals, and special issues.

The project uses a low-maintenance architecture:

- Static frontend: React, Vite, TypeScript, Tailwind CSS, shadcn-style local UI components, TanStack Table, date-fns
- Public data: YAML files under `data/`
- Validation: JSON Schema plus custom consistency checks
- Deployment: GitHub Pages through GitHub Actions

## Website

After GitHub Pages is enabled, the public site will be available at:

https://aries-fu.github.io/se-publication-deadlines/

## What Kinds of Deadlines Are Included?

This repository tracks deadlines related to software engineering publication opportunities, including:

- Research track deadlines for conferences
- Journal venue metadata
- Special issue submission deadlines
- Multi-stage deadlines such as abstract, full paper, revision, notification, and camera-ready dates

Journals are shown as a venue list rather than deadline rows. Their deadline and status fields are displayed as `N/A` unless there is a dated special issue record.

## Data Structure

Human-maintained data lives under `data/`.

```text
data/
|-- categories.yml
|-- venues/
|   |-- journals.yml
|   `-- conferences.yml
`-- deadlines/
    |-- 2026.yml
    |-- 2027.yml
    `-- special-issues.yml
```

Frontend-ready generated data lives at:

```text
src/data/generated-deadlines.json
```

Do not edit the generated JSON by hand. Edit YAML files under `data/`, then run:

```bash
npm run build:data
```

## How to Add a New Deadline

If you do not want to edit YAML directly, open a structured issue form:

https://github.com/Aries-Fu/se-publication-deadlines/issues/new/choose

Add a new entry to one of the files under `data/deadlines/`.

Journal metadata belongs under `data/venues/`. Journals do not need deadline records unless they host a dated special issue call.

Use this format:

```yaml
- id: unique-deadline-id
  venueId: venue-id
  title: Title of the call
  type: special_issue
  status: open

  deadlines:
    - label: abstract
      date: YYYY-MM-DD
      timezone: Anywhere on Earth
    - label: full_paper
      date: YYYY-MM-DD
      timezone: Anywhere on Earth

  categories:
    primary: SE
    secondary:
      - AI4SE
      - MDE

  links:
    callForPapers: https://example.com/cfp
    submission: https://example.com/submission

  source:
    url: https://example.com/cfp
    checkedDate: YYYY-MM-DD

  notes: >
    Optional notes that help contributors understand the call.
```

Keep multiple deadlines for the same call in one record. For example, do not split abstract and full paper deadlines into separate records.

## Required Fields

Deadline records must include:

- `id`
- `venueId`
- `title`
- `type`
- `status`
- `deadlines`
- `categories.primary`
- `categories.secondary`
- `source.url`
- `source.checkedDate`

Each item in `deadlines` must include:

- `label`
- `date`
- `timezone`

Dates must use `YYYY-MM-DD`.

## Optional Fields

Deadline records may include:

- `links.callForPapers`
- `links.submission`
- `rank.core`
- `rank.ccf`
- `rank.jcrQuartile`
- `notes`

Venue metadata may include:

- `publisher`
- `website`
- `ranking.core`
- `ranking.ccf`
- `metrics.impactFactor`
- `metrics.jcrQuartile`
- `metricsYear`
- `notes`

Impact factors change every year. Always include `metricsYear` when adding or updating impact factor data.

## Category List

Categories are configured in `data/categories.yml`. Current top-level category:

- `SE`: Software Engineering

Current subcategories include:

- `AI4SE`
- `SE4AI`
- `MDE`
- `Testing`
- `Maintenance`
- `Requirements`
- `Architecture`
- `DigitalTwins`
- `EmpiricalSE`
- `SoftwareAnalytics`
- `ProgramAnalysis`
- `Security`
- `HumanCenteredSE`

Add new categories to `data/categories.yml` before using them in a deadline record.

## Deadline Label List

Allowed labels are:

- `abstract`
- `full_paper`
- `submission`
- `submission_open`
- `author_response`
- `notification`
- `revision`
- `camera_ready`
- `final_decision`
- `registration`
- `proposal`

Use the most specific label available. If a label is missing, open an issue before adding a new one.

## Local Development

Install dependencies:

```bash
npm install
```

Validate YAML data:

```bash
npm run validate:data
```

Build generated frontend data:

```bash
npm run build:data
```

Run the frontend:

```bash
npm run dev
```

Build the site:

```bash
npm run build
```

## Favorites

The website supports local favorites. Users can star deadline records or journal venues, then enable `Favorites only` in the filters.

Favorites are stored in the user's browser with `localStorage`. They are private to that browser and are not committed to the repository.

## How to Submit a Pull Request

1. Fork this repository.
2. Add or edit YAML files under `data/`.
3. Add venue metadata under `data/venues/` if the `venueId` does not exist yet.
4. Run `npm run validate:data` locally if possible.
5. Open a pull request.
6. GitHub Actions will validate the data format and build the site.
7. Maintainers review and merge.

## Issue Forms

Use GitHub Issue Forms if you want to suggest data without editing YAML:

- Add a deadline: conference and special issue calls
- Add a journal: journal metadata without deadline rows
- Correct existing data: wrong dates, venue metadata, rankings, metrics, or source links

Maintainers convert accepted issue submissions into YAML changes.

## Data Quality Rules

- Use official call-for-papers pages whenever possible.
- Every deadline record must include a source URL and checked date.
- Use `Anywhere on Earth` when the call states AoE.
- Do not invent impact factors, rankings, or deadlines.
- Do not mix ranking systems into one combined ranking.
- Prefer one record with multiple deadline labels over duplicate records for the same call.
- Mark uncertain data as `tentative`.

## Maintainer Setup

Recommended GitHub repository settings:

- Protect `main`.
- Require pull requests before merging.
- Require the `Validate data` workflow to pass.
- Require at least one review.
- Disable force pushes to `main`.
- Use `.github/CODEOWNERS` for data review ownership.

## License

The source code in this repository is licensed under the MIT License.

The deadline data and venue metadata are licensed under the Creative Commons Attribution 4.0 International License (CC BY 4.0), unless otherwise stated.

## Disclaimer

Deadlines can change. Always verify dates on the official source page before submitting work.
