import { format } from "date-fns";

// Columns used for export and as the canonical import template.
export const CLIENT_CSV_HEADERS = [
  "name",
  "email",
  "phone",
  "total_visits",
  "total_spent",
  "last_visit",
  "staff_notes",
];

// Fields a CSV/PDF column can be mapped to, in the order shown in manual-mapping UIs.
export const MAPPABLE_FIELDS = [
  { value: "name", label: "Name" },
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "total_visits", label: "Total Visits" },
  { value: "total_spent", label: "Total Spent" },
  { value: "last_visit", label: "Last Visit" },
  { value: "staff_notes", label: "Notes" },
];

// Maps a normalized header (lowercased, alphanumeric only) to a client field.
// Includes the column names used by Square, Vagaro, Booksy, and Mindbody exports.
export const HEADER_ALIASES = {
  name: ["name", "clientname", "customername", "fullname", "client"],
  first_name: ["firstname", "first", "clientfirstname", "customerfirstname"],
  last_name: ["lastname", "last", "clientlastname", "customerlastname", "surname"],
  email: ["email", "emailaddress", "email1", "primaryemail"],
  phone: [
    "phone",
    "phonenumber",
    "cellphone",
    "cell",
    "mobile",
    "mobilephone",
    "homephone",
    "primaryphone",
    "phone1",
  ],
  total_visits: [
    "totalvisits",
    "visits",
    "visitcount",
    "visitstotal",
    "numberofvisits",
    "totalappointments",
    "appointmentcount",
    "ofvisits",
  ],
  total_spent: [
    "totalspent",
    "totalspend",
    "totalsales",
    "lifetimevalue",
    "ltv",
    "totalrevenue",
    "amountspent",
    "totalpaid",
    "totalsalesamount",
  ],
  last_visit: [
    "lastvisit",
    "lastvisitdate",
    "lastappointment",
    "lastappointmentdate",
    "mostrecentvisit",
    "lastvisited",
  ],
  staff_notes: ["staffnotes", "notes", "customernotes", "clientnotes", "comments", "note"],
};

export function normalizeHeader(header) {
  return (header || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Builds a { field: columnIndex } map from a header row by matching against HEADER_ALIASES.
export function buildColumnMap(headerRow) {
  const normalized = headerRow.map(normalizeHeader);
  const columnMap = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias);
      if (idx !== -1) {
        columnMap[field] = idx;
        break;
      }
    }
  }
  return columnMap;
}

// Converts a single data row into a normalized client record using a { field: columnIndex } map.
export function mapRowToClient(row, columnMap) {
  const get = (field) =>
    columnMap[field] !== undefined ? (row[columnMap[field]] || "").trim() : "";

  let name = get("name");
  if (!name) {
    name = [get("first_name"), get("last_name")].filter(Boolean).join(" ").trim();
  }

  const visitsRaw = get("total_visits").replace(/[^0-9.-]/g, "");
  const spentRaw = get("total_spent").replace(/[^0-9.-]/g, "");

  let lastVisit = "";
  const lastVisitRaw = get("last_visit");
  if (lastVisitRaw) {
    const parsed = new Date(lastVisitRaw);
    if (!isNaN(parsed.getTime())) {
      lastVisit = format(parsed, "yyyy-MM-dd");
    }
  }

  return {
    name,
    email: get("email"),
    phone: get("phone"),
    total_visits: visitsRaw ? parseInt(visitsRaw, 10) || 0 : 0,
    total_spent: spentRaw ? parseFloat(spentRaw) || 0 : 0,
    last_visit: lastVisit,
    staff_notes: get("staff_notes"),
  };
}

export function normalizePhone(phone) {
  return (phone || "").replace(/\D/g, "");
}

export function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function escapeCSVField(value) {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCSV(rows, filename) {
  const csv = rows.map((row) => row.map(escapeCSVField).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportClientsToCSV(clients) {
  const rows = [CLIENT_CSV_HEADERS];
  for (const client of clients) {
    rows.push([
      client.name || "",
      client.email || "",
      client.phone || "",
      client.total_visits ?? 0,
      Number(client.total_spent ?? 0).toFixed(2),
      client.last_visit || "",
      client.staff_notes || "",
    ]);
  }
  downloadCSV(rows, `clients-export-${format(new Date(), "yyyy-MM-dd")}.csv`);
}

export function downloadClientImportTemplate() {
  const rows = [
    CLIENT_CSV_HEADERS,
    [
      "Jane Smith",
      "jane@example.com",
      "5551234567",
      "12",
      "540.00",
      "2026-05-01",
      "Prefers afternoon appointments",
    ],
  ];
  downloadCSV(rows, "client-import-template.csv");
}

// Parses raw CSV text (handles quoted fields containing commas/newlines/escaped quotes).
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\r") {
      // skip, \n handles the row break
    } else if (char === "\n") {
      pushRow();
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

// Parses an uploaded CSV's text into normalized client records ready for preview/import.
export function parseClientImportCSV(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) {
    return { headers: [], columnMap: {}, clients: [] };
  }

  const [headerRow, ...dataRows] = rows;
  const columnMap = buildColumnMap(headerRow);

  const clients = dataRows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => mapRowToClient(row, columnMap));

  return { headers: headerRow, columnMap, clients };
}
