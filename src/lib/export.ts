/** Export CSV (compatible Excel) des tableaux de rapport. */

export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const v = String(cell ?? "");
          return /[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(";"),
    )
    .join("\r\n");
}

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
