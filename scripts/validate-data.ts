import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  allowedCcfRanks,
  allowedCoreRanks,
  allowedDeadlineLabels,
  allowedJcrQuartiles,
  allowedSourceAdapters,
  categoryIds,
  dataDir,
  isDateOnly,
  isObject,
  loadCategories,
  loadDeadlineRecords,
  loadSources,
  loadVenues,
  rootDir,
  type CategorySelection,
  type Rank,
  type SourceDefinition,
  type Venue,
} from "./data-utils";

const errors: string[] = [];
const allowedVenueTypes = new Set(["conference", "journal"]);

function rel(filePath: string): string {
  return relative(rootDir, filePath);
}

function pushError(message: string): void {
  errors.push(message);
}

function validateUnique(values: Array<{ id?: string }>, label: string): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (!value.id) {
      pushError(`${label} is missing an id`);
      continue;
    }

    if (seen.has(value.id)) {
      pushError(`Duplicate ${label} id: ${value.id}`);
    }

    seen.add(value.id);
  }
}

function validateCategorySelection(
  owner: string,
  selection: CategorySelection | undefined,
  primaryIds: Set<string>,
  allCategoryIds: Set<string>,
): void {
  if (!selection) {
    pushError(`${owner} is missing categories`);
    return;
  }

  if (!primaryIds.has(selection.primary)) {
    pushError(`${owner} uses unknown primary category: ${selection.primary}`);
  }

  for (const secondary of selection.secondary ?? []) {
    if (!allCategoryIds.has(secondary)) {
      pushError(`${owner} uses unknown secondary category: ${secondary}`);
    }
  }
}

function validateRank(owner: string, rank: Rank | undefined): void {
  if (!rank) {
    return;
  }

  if (rank.core && !allowedCoreRanks.includes(rank.core as (typeof allowedCoreRanks)[number])) {
    pushError(`${owner} has invalid CORE rank: ${rank.core}`);
  }

  if (rank.ccf && !allowedCcfRanks.includes(rank.ccf as (typeof allowedCcfRanks)[number])) {
    pushError(`${owner} has invalid CCF rank: ${rank.ccf}`);
  }

  if (
    rank.jcrQuartile &&
    !allowedJcrQuartiles.includes(rank.jcrQuartile as (typeof allowedJcrQuartiles)[number])
  ) {
    pushError(`${owner} has invalid JCR quartile: ${rank.jcrQuartile}`);
  }
}

function isValidUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateVenue(venue: Venue, primaryIds: Set<string>, allCategoryIds: Set<string>): void {
  const owner = `venue ${venue.id ?? "(missing id)"}`;

  for (const field of ["id", "name", "shortName", "type", "website"] as const) {
    if (!venue[field]) {
      pushError(`${owner} is missing ${field}`);
    }
  }

  if (venue.type && !allowedVenueTypes.has(venue.type)) {
    pushError(`${owner} has invalid type: ${venue.type}`);
  }

  if (venue.website && !isValidUrl(venue.website)) {
    pushError(`${owner} website must be a valid URL`);
  }

  if (venue.source?.url && !isValidUrl(venue.source.url)) {
    pushError(`${owner} source.url must be a valid URL`);
  }

  validateCategorySelection(owner, venue.categories, primaryIds, allCategoryIds);
  validateRank(owner, venue.ranking);

  if (venue.metrics?.jcrQuartile) {
    validateRank(owner, { jcrQuartile: venue.metrics.jcrQuartile });
  }

  if (venue.metrics?.impactFactor !== undefined && venue.metrics.impactFactor <= 0) {
    pushError(`${owner} impactFactor must be greater than 0`);
  }

  if (venue.metrics?.impactFactor !== undefined && venue.metricsYear === undefined) {
    pushError(`${owner} has impactFactor but is missing metricsYear`);
  }

  if (venue.metricsYear !== undefined && !Number.isInteger(venue.metricsYear)) {
    pushError(`${owner} metricsYear must be an integer`);
  }

  if (venue.source?.checkedDate && !isDateOnly(venue.source.checkedDate)) {
    pushError(`${owner} source.checkedDate must use YYYY-MM-DD`);
  }
}

function validateSourceDefinition(
  source: SourceDefinition,
  venueIds: Set<string>,
  recordIds: Set<string>,
): void {
  const owner = `source ${source.id ?? "(missing id)"}`;

  if (!source.id) {
    pushError("A source is missing id");
  }

  if (!source.url || !isValidUrl(source.url)) {
    pushError(`${owner} url must be a valid URL`);
  }

  if (!source.kind) {
    pushError(`${owner} is missing kind`);
  }

  if (source.kind && !["deadline", "venue", "workshop", "special_issue"].includes(source.kind)) {
    pushError(`${owner} has invalid kind: ${source.kind}`);
  }

  if (source.adapter && !allowedSourceAdapters.includes(source.adapter)) {
    pushError(`${owner} has invalid adapter: ${source.adapter}`);
  }

  if (source.venueId && !venueIds.has(source.venueId)) {
    pushError(`${owner} references unknown venueId: ${source.venueId}`);
  }

  if (source.recordId && !recordIds.has(source.recordId)) {
    pushError(`${owner} references unknown recordId: ${source.recordId}`);
  }

  if (
    (source.kind === "deadline" || source.kind === "workshop" || source.kind === "special_issue") &&
    !source.recordId
  ) {
    pushError(`${owner} is missing recordId`);
  }

  for (const label of source.expectedDeadlineLabels ?? []) {
    if (!allowedDeadlineLabels.includes(label as (typeof allowedDeadlineLabels)[number])) {
      pushError(`${owner} has invalid expected deadline label: ${label}`);
    }
  }
}

async function main(): Promise<void> {
  const schema = JSON.parse(await readFile(join(rootDir, "schemas/deadline.schema.json"), "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const validateDeadlineFile = ajv.compile(schema);

  const [categories, venues, records, sources] = await Promise.all([
    loadCategories(),
    loadVenues(),
    loadDeadlineRecords(),
    loadSources(),
  ]);

  const { primaryIds, allIds } = categoryIds(categories);

  validateUnique(categories, "category");
  for (const category of categories) {
    if (!category.id) {
      pushError("A category is missing id");
    }
    if (!category.name) {
      pushError(`category ${category.id ?? "(missing id)"} is missing name`);
    }
    validateUnique(category.children ?? [], `subcategory under ${category.id}`);
  }

  validateUnique(venues, "venue");
  for (const venue of venues) {
    validateVenue(venue, primaryIds, allIds);
  }

  const venuesById = new Map(venues.map((venue) => [venue.id, venue]));
  const recordsByFile = new Map<string, unknown[]>();

  for (const record of records) {
    const { sourceFile, ...schemaRecord } = record;
    const existing = recordsByFile.get(record.sourceFile) ?? [];
    existing.push(schemaRecord);
    recordsByFile.set(record.sourceFile, existing);
  }

  for (const [file, fileRecords] of recordsByFile) {
    if (!validateDeadlineFile(fileRecords)) {
      for (const error of validateDeadlineFile.errors ?? []) {
        const location = error.instancePath || "/";
        pushError(`${rel(file)} ${location}: ${error.message}`);
      }
    }
  }

  validateUnique(records, "deadline record");
  validateUnique(sources, "source");

  const venueIds = new Set(venues.map((venue) => venue.id));
  const recordIds = new Set(records.map((record) => record.id));

  for (const record of records) {
    const owner = `deadline ${record.id ?? "(missing id)"}`;

    if (!venuesById.has(record.venueId)) {
      pushError(`${owner} references unknown venueId: ${record.venueId}`);
    }

    validateCategorySelection(owner, record.categories, primaryIds, allIds);
    validateRank(owner, record.rank);

    if (record.source?.checkedDate && !isDateOnly(record.source.checkedDate)) {
      pushError(`${owner} source.checkedDate must use YYYY-MM-DD`);
    }

    for (const deadline of record.deadlines ?? []) {
      if (!isObject(deadline)) {
        pushError(`${owner} has a non-object deadline item`);
        continue;
      }

      if (typeof deadline.date === "string" && !isDateOnly(deadline.date)) {
        pushError(`${owner} has invalid deadline date: ${deadline.date}`);
      }
    }
  }

  for (const source of sources) {
    validateSourceDefinition(source, venueIds, recordIds);
  }

  if (errors.length > 0) {
    console.error(`Data validation failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `Validated ${venues.length} venues, ${records.length} deadline records, ${sources.length} sources, and ${categories.length} category groups from ${rel(dataDir)}.`,
  );
}

void main();
