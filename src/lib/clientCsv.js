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
