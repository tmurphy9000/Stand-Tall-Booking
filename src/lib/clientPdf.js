import { format } from "date-fns";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { buildColumnMap, mapRowToClient } from "./clientCsv";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_REGEX = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const DOLLAR_REGEX = /\$\s?[\d,]+(?:\.\d{1,2})?/;
const DATE_REGEX = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/;

const COLUMN_TOLERANCE = 8; // PDF point units
const MAX_TABLE_COLUMNS = 10;

// Groups a page's text items into lines by y-position, sorted top-to-bottom / left-to-right.
function groupItemsIntoLines(items) {
  const lineGroups = new Map(); // rounded y -> items[]
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const y = Math.round(item.transform[5]);
    let key = y;
    for (const existingKey of lineGroups.keys()) {
      if (Math.abs(existingKey - y) <= 2) {
        key = existingKey;
        break;
      }
    }
    if (!lineGroups.has(key)) lineGroups.set(key, []);
    lineGroups.get(key).push(item);
  }

  const sortedKeys = [...lineGroups.keys()].sort((a, b) => b - a);
  return sortedKeys.map((key) =>
    lineGroups
      .get(key)
      .sort((a, b) => a.transform[4] - b.transform[4])
      .map((item) => ({ x: item.transform[4], endX: item.transform[4] + item.width, str: item.str.trim() }))
      .filter((item) => item.str !== "")
  ).filter((line) => line.length > 0);
}

// Finds shared column start positions across all lines, merging x-positions within
// COLUMN_TOLERANCE of each other. Widens the tolerance if that produces too many columns
// (e.g. for pages that are mostly free-form paragraphs rather than a table).
function clusterColumnAnchors(allLines) {
  const xs = allLines.flatMap((items) => items.map((item) => item.x)).sort((a, b) => a - b);

  let tolerance = COLUMN_TOLERANCE;
  let anchors = [];
  for (let attempt = 0; attempt < 6; attempt++) {
    anchors = [];
    for (const x of xs) {
      if (anchors.length === 0 || x - anchors[anchors.length - 1] > tolerance) {
        anchors.push(x);
      }
    }
    if (anchors.length <= MAX_TABLE_COLUMNS) break;
    tolerance *= 1.5;
  }
  return anchors;
}

// Assigns each item on a line to the nearest column anchor, producing a dense row array.
function lineToTableRow(items, anchors) {
  const row = [];
  for (const item of items) {
    let colIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < anchors.length; i++) {
      const dist = Math.abs(item.x - anchors[i]);
      if (dist < minDist) {
        minDist = dist;
        colIdx = i;
      }
    }
    row[colIdx] = row[colIdx] ? `${row[colIdx]} ${item.str}` : item.str;
  }
  const dense = [];
  for (let i = 0; i < row.length; i++) dense.push(row[i] || "");
  while (dense.length && dense[dense.length - 1] === "") dense.pop();
  return dense;
}

// Reconstructs a readable text line from a line's items, using extra spacing for big gaps.
function lineToText(items) {
  let lineText = "";
  let prevEnd = null;
  for (const item of items) {
    if (prevEnd !== null) {
      const gap = item.x - prevEnd;
      lineText += gap > 10 ? "    " : " ";
    }
    lineText += item.str;
    prevEnd = item.endX;
  }
  return lineText;
}

// Extracts a PDF's content as both plain text lines and a best-effort table
// (rows of cells), reconstructed from the positioned text items on each page.
// Column boundaries are detected by clustering the x-positions where text starts
// across the whole document, which is far more robust than per-line gap thresholds
// for the kinds of client-list exports produced by Square, Vagaro, Booksy, and Mindbody.
export async function extractPdfTable(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allLineItems = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    allLineItems.push(...groupItemsIntoLines(textContent.items));
  }

  const lines = allLineItems.map(lineToText);

  const anchors = clusterColumnAnchors(allLineItems);
  const tableRows = allLineItems.map((items) => lineToTableRow(items, anchors));

  return { lines, tableRows };
}

// Tries to find a header row (within the first few rows) whose cells map to at least
// two known client fields, including a name-ish field plus contact info. Matching is
// case-insensitive and ignores punctuation/spacing (see normalizeHeader / HEADER_ALIASES),
// so headers like "First Name", "Customer Name", "Cell Phone", "E-Mail", etc. all match.
function findHeaderRow(tableRows) {
  const maxScan = Math.min(tableRows.length, 5);
  for (let i = 0; i < maxScan; i++) {
    const cells = tableRows[i];
    if (cells.length < 2) continue;
    const columnMap = buildColumnMap(cells);
    const fields = Object.keys(columnMap);
    const hasName = fields.includes("name") || fields.includes("first_name") || fields.includes("last_name");
    const hasContact = fields.includes("email") || fields.includes("phone");
    if (fields.length >= 2 && hasName && hasContact) {
      return { index: i, columnMap };
    }
  }
  return null;
}

// Best-effort extraction of a client record from a single freeform line of text,
// using regex pattern matching for phone numbers, emails, dollar amounts, and dates.
function parseLineByPattern(line) {
  const emailMatch = line.match(EMAIL_REGEX);
  const phoneMatch = line.match(PHONE_REGEX);
  if (!emailMatch && !phoneMatch) return null;

  let remainder = line;

  let totalSpent = 0;
  const dollarMatch = remainder.match(DOLLAR_REGEX);
  if (dollarMatch) {
    totalSpent = parseFloat(dollarMatch[0].replace(/[$,]/g, "")) || 0;
    remainder = remainder.replace(dollarMatch[0], " ");
  }

  let lastVisit = "";
  const dateMatch = remainder.match(DATE_REGEX);
  if (dateMatch) {
    const parsed = new Date(dateMatch[0]);
    if (!isNaN(parsed.getTime())) lastVisit = format(parsed, "yyyy-MM-dd");
    remainder = remainder.replace(dateMatch[0], " ");
  }

  let phone = "";
  if (phoneMatch) {
    phone = phoneMatch[0].replace(/\D/g, "");
    remainder = remainder.replace(phoneMatch[0], " ");
  }

  let email = "";
  if (emailMatch) {
    email = emailMatch[0].toLowerCase();
    remainder = remainder.replace(emailMatch[0], " ");
  }

  const name = remainder
    .replace(/[#|_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/^[\s,.\-:]+|[\s,.\-:]+$/g, "");

  return {
    name,
    email,
    phone,
    total_visits: 0,
    total_spent: totalSpent,
    last_visit: lastVisit,
    staff_notes: "",
  };
}

// Parses an extracted PDF table into client records.
//
// Returns one of:
//  - { mode: "structured", clients, columnMap, headerIndex } — a header row mapped to known
//      fields was found. First/last name columns are automatically combined into a single
//      "name" field (handled by mapRowToClient). columnMap/headerIndex describe the detected
//      header so the UI can pre-fill a manual remap if the user wants to adjust it.
//  - { mode: "pattern", clients }                — no header, but phone/email pattern matching
//      found client rows in the plain text.
//  - { mode: "raw", lines, tableRows }           — couldn't auto-detect anything; the caller
//      should let the user manually map tableRows' columns to client fields.
export function parsePdfTable({ lines, tableRows }) {
  const header = findHeaderRow(tableRows);
  if (header) {
    const clients = tableRows
      .slice(header.index + 1)
      .filter((cells) => cells.length > 0)
      .map((cells) => mapRowToClient(cells, header.columnMap))
      .filter((c) => c.name || c.email || c.phone);

    if (clients.length > 0) {
      return { mode: "structured", clients, columnMap: header.columnMap, headerIndex: header.index };
    }
  }

  const patternClients = lines
    .map(parseLineByPattern)
    .filter(Boolean)
    .filter((c) => c.name || c.email || c.phone);

  if (patternClients.length > 0) {
    return { mode: "pattern", clients: patternClients };
  }

  return { mode: "raw", lines, tableRows };
}
