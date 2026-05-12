export function csvCell(value: string | number | boolean | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function downloadCsv(
  fileName: string,
  rows: Array<Record<string, string | number | boolean | undefined>>,
) {
  const headers = Object.keys(rows[0] ?? { empty: "" });
  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
