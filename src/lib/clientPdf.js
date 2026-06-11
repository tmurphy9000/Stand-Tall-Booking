import { format } from "date-fns";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { buildColumnMap, mapRowToClient } from "./clientCsv";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_REGEX = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const DOLLAR_REGEX = /\$\s?[\d,]+(?:\.\d{1,2})?/;
const DATE_REGEX = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/;

// Extracts text from a PDF as an array of lines, reconstructed from the
// positioned text items on each page (left-to-right, top-to-bottom).
// Big horizontal gaps between items (likely a column break in a table)
// are preserved as runs of spaces so table-like PDFs can be split into columns.
export async function extractPdfLines(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const lines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const lineGroups = new Map(); // rounded y -> items[]
    for (const item of textContent.items) {
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
    for (const key of sortedKeys) {
      const items = lineGroups.get(key).sort((a, b) => a.transform[4] - b.transform[4]);
      let lineText = "";
      let prevEnd = null;
      for (const item of items) {
        const x = item.transform[4];
        if (prevEnd !== null) {
          const gap = x - prevEnd;
          if (gap > 10) lineText += "    ";
          else if (gap > 1) lineText += " ";
        }
        lineText += item.str;
        prevEnd = x + item.width;
      }
      if (lineText.trim()) lines.push(lineText.trim());
    }
  }

  return lines;
}

// Splits a reconstructed PDF line into table-style columns on runs of 2+ spaces or tabs.
export function splitTableRow(line) {
  return line.split(/\s{2,}|\t/).map((cell) => cell.trim()).filter((cell) => cell !== "");
}

// Tries to find a header line (within the first few lines) whose columns map to
// at least two known client fields, including a name-ish field plus contact info.
function findHeaderRow(lines) {
  const maxScan = Math.min(lines.length, 5);
  for (let i = 0; i < maxScan; i++) {
    const cells = splitTableRow(lines[i]);
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

// Parses extracted PDF lines into client records.
//
// Returns one of:
//  - { mode: "structured", clients }  — a header row mapped to known fields was found
//  - { mode: "pattern", clients }     — no header, but phone/email pattern matching found client rows
//  - { mode: "raw", lines }           — couldn't auto-detect anything; caller should let the
//                                        user manually map columns from `lines`
export function parsePdfLines(lines) {
  const header = findHeaderRow(lines);
  if (header) {
    const clients = lines
      .slice(header.index + 1)
      .map(splitTableRow)
      .filter((cells) => cells.length > 0)
      .map((cells) => mapRowToClient(cells, header.columnMap))
      .filter((c) => c.name || c.email || c.phone);

    if (clients.length > 0) {
      return { mode: "structured", clients };
    }
  }

  const patternClients = lines
    .map(parseLineByPattern)
    .filter(Boolean)
    .filter((c) => c.name || c.email || c.phone);

  if (patternClients.length > 0) {
    return { mode: "pattern", clients: patternClients };
  }

  return { mode: "raw", lines };
}
