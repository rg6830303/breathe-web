"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import {
  FileSpreadsheet, Upload, Download, Check, AlertCircle,
  Loader2, Play, AlertTriangle
} from "lucide-react";
import { AdminSubHeader } from "@/components/admin/admin-sub-header";

type ParsedRow = {
  date: string;
  time: string;
  duration_min: number;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  amount: number;
  status: "confirmed" | "cancelled" | "no_show";
  notes?: string | null;
  // internal fields for wizard UI
  originalRowIndex: number;
  isValid: boolean;
  validationError: string | null;
  isExcluded: boolean;
};

export default function ImportWizardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<unknown | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check admin session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        if (data.user && data.user.role === "admin") {
          setAdmin(data.user);
        } else {
          router.push("/admin/login");
        }
      })
      .catch(() => {
        router.push("/admin/login");
      })
      .finally(() => setLoadingAdmin(false));
  }, [router]);

  // Date format auto-detection and normalization to YYYY-MM-DD
  const normalizeDate = (val: string | number): { date: string; err: boolean } => {
    if (!val) return { date: "", err: true };
    const str = String(val).trim();

    // Check if it's an Excel serial date number
    if (/^\d{5}$/.test(str)) {
      const serial = Number(str);
      const dateObj = new Date((serial - 25569) * 86400 * 1000);
      if (!isNaN(dateObj.getTime())) {
        return { date: dateObj.toISOString().slice(0, 10), err: false };
      }
    }

    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return { date: str, err: false };
    }

    // Try DD/MM/YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const d = dmyMatch[1].padStart(2, "0");
      const m = dmyMatch[2].padStart(2, "0");
      const y = dmyMatch[3];
      return { date: `${y}-${m}-${d}`, err: false };
    }

    // Try MM/DD/YYYY
    const mdyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (mdyMatch) {
      const m = mdyMatch[1].padStart(2, "0");
      const d = mdyMatch[2].padStart(2, "0");
      const y = mdyMatch[3];
      // Note: we default to DD/MM/YYYY since it's the standard in India (en-IN).
      // We can fallback or allow checks.
      return { date: `${y}-${m}-${d}`, err: false };
    }

    return { date: str, err: true };
  };

  // Validate a row client-side to assign badges
  const validateRowClient = (row: any): { isValid: boolean; error: string | null } => {
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

    if (!row.date || String(row.date).trim().length === 0) return { isValid: false, error: "Missing Date." };
    if (!row.time || !timeRegex.test(String(row.time).trim().slice(0, 5))) return { isValid: false, error: "Invalid time format (HH:MM)." };
    if (!row.customer_name || String(row.customer_name).trim().length === 0) return { isValid: false, error: "Missing Customer Name." };
    if (!row.customer_phone || String(row.customer_phone).trim().length < 8) return { isValid: false, error: "Invalid Phone Number." };
    if (row.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.customer_email)) return { isValid: false, error: "Invalid Email format." };
    if (isNaN(Number(row.amount)) || Number(row.amount) < 0) return { isValid: false, error: "Amount must be a positive number." };

    return { isValid: true, error: null as string | null };
  };

  // Parse spreadsheet contents
  const processImportFile = useCallback((file: File) => {
    setParsing(true);
    setError(null);
    setSuccess(null);
    setRows([]);

    const reader = new FileReader();

    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      const parsedRows: any[] = [];
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (extension === "xlsx" || extension === "xls") {
        // Excel processing
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        parsedRows.push(...json);
      } else {
        // CSV processing
        const csvStr = new TextDecoder("utf-8").decode(data as ArrayBuffer);
        const parsed = Papa.parse(csvStr, { header: true, skipEmptyLines: true });
        parsedRows.push(...parsed.data);
      }

      // Map rows to structured ParsedRow
      const mapped: ParsedRow[] = parsedRows.map((row: any, idx) => {
        // Coalesce columns case-insensitively
        const findVal = (keys: string[]) => {
          const match = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
          return match ? row[match] : "";
        };

        const rawDate = findVal(["date", "slot_date", "booking_date"]);
        const rawTime = findVal(["time", "slot_time", "booking_time"]);
        const rawName = findVal(["customer_name", "name", "guest_name", "user_name"]);
        const rawPhone = findVal(["customer_phone", "phone", "guest_phone", "phone_number"]);
        const rawEmail = findVal(["customer_email", "email", "guest_email"]);
        const rawAmount = findVal(["amount", "price", "subtotal", "amount_paid"]);
        const rawNotes = findVal(["notes", "note", "description"]);
        const rawStatus = findVal(["status", "booking_status"]);
        const rawDuration = findVal(["duration", "duration_min", "duration_minutes"]);

        const { date, err: dateErr } = normalizeDate(rawDate);

        let timeFormatted = String(rawTime).trim();
        // If hour is a number like 9 or 18, pad it
        if (/^\d{1,2}$/.test(timeFormatted)) {
          timeFormatted = `${timeFormatted.padStart(2, "0")}:00`;
        }

        const duration_min = Number(rawDuration) || 60;
        const amount = Number(rawAmount) || 0;
        let status: "confirmed" | "cancelled" | "no_show" = "confirmed";
        const stStr = String(rawStatus).toLowerCase().trim();
        if (stStr === "cancelled" || stStr === "cancelled") status = "cancelled";
        if (stStr === "no_show" || stStr === "no-show") status = "no_show";

        const mappedRow = {
          date,
          time: timeFormatted,
          duration_min,
          customer_name: String(rawName).trim(),
          customer_phone: String(rawPhone).trim(),
          customer_email: rawEmail ? String(rawEmail).trim() : null,
          amount,
          status,
          notes: rawNotes ? String(rawNotes).trim() : null,
          originalRowIndex: idx + 1,
          isValid: false,
          validationError: null as string | null,
          isExcluded: false
        };

        const validation = validateRowClient(mappedRow);
        mappedRow.isValid = validation.isValid && !dateErr;
        mappedRow.validationError = dateErr ? "Invalid date format." : (validation.error as string | null);

        // Auto-exclude invalid rows
        mappedRow.isExcluded = !mappedRow.isValid;

        return mappedRow;
      });

      setRows(mapped);
      setParsing(false);
    };

    if (file.name.split(".").pop()?.toLowerCase() === "csv") {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsBinaryString(file);
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      processImportFile(acceptedFiles[0]);
    }
  }, [processImportFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false
  });

  const toggleExclude = (index: number) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[index].isExcluded = !copy[index].isExcluded;
      return copy;
    });
  };

  // Run the batch import POST to backend
  const commitImport = async () => {
    const toImport = rows.filter((r) => !r.isExcluded);
    if (toImport.length === 0) return;

    setImporting(true);
    setProgress(15);
    setError(null);
    setSuccess(null);

    try {
      setProgress(40);
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: toImport }),
      });

      setProgress(80);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import transaction failed.");

      setProgress(100);
      setSuccess(`Successfully imported ${data.imported} bookings! (${data.skipped} duplicate rows skipped).`);
      setRows([]);
      setTimeout(() => router.push("/admin"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Import failed");
      setProgress(0);
    } finally {
      setImporting(false);
    }
  };

  // Generate template CSV download dynamically in the browser
  const downloadTemplate = () => {
    const headers = [
      "date", "time", "duration_min", "customer_name",
      "customer_phone", "amount", "customer_email", "notes", "status"
    ];
    const sample = [
      "2026-06-01", "18:00", "60", "Rahul Gupta",
      "+917439010356", "900", "rahul@breathepickleball.in", "Court booking", "confirmed"
    ];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + sample.join(",");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "breathe_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadingAdmin || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-lime" />
          <p className="mt-4 text-sm text-white/60">Verifying session credentials…</p>
        </div>
      </div>
    );
  }

  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.filter((r) => !r.isValid).length;
  const includedCount = rows.filter((r) => !r.isExcluded).length;

  return (
    <main className="app-surface min-h-screen bg-brand-50/30 px-4 py-8 dark:bg-ink sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">

        <AdminSubHeader
          title="Booking import"
          subtitle="Batch import historical spreadsheet bookings directly into the Turso database."
          icon={<FileSpreadsheet className="h-5 w-5 text-lime" />}
          actions={
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/20 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white transition hover:border-lime hover:text-lime"
            >
              <Download className="h-3.5 w-3.5" /> Download template
            </button>
          }
        />

        {/* Alert messages */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-lime/40 bg-lime/10 p-4 text-sm text-lime-dark dark:border-lime/30 dark:bg-lime/[0.08]" role="status">
            <Check className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
            <span>{success}</span>
          </div>
        )}

        {/* Progress bar */}
        {importing && (
          <div className="card-sport p-4">
            <div className="mb-2 flex items-center justify-between text-xs font-extrabold uppercase tracking-wide text-ink dark:text-white">
              <span>Importing rows…</span>
              <span className="text-brand">{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-lime transition-all duration-300"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        {/* Step 1: Drop zone */}
        <section className="card-sport p-0 overflow-hidden">
          <div className="tape-stripe h-1.5 w-full" />
          <div className="p-5">
            <span className="eyebrow mb-3">Step 1</span>
            <div
              {...getRootProps()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                isDragActive
                  ? "border-lime bg-lime/5 dark:bg-lime/[0.07]"
                  : "border-ink/15 bg-ink/[0.01] hover:border-brand/40 dark:border-white/15 dark:bg-white/[0.01] dark:hover:border-brand-300/40"
              }`}
            >
              <input {...getInputProps()} />
              <Upload
                className={`mx-auto mb-3 h-12 w-12 transition ${isDragActive ? "text-lime-dark" : "text-brand"}`}
                aria-hidden
              />
              <p className="font-extrabold text-sm text-ink dark:text-white">
                Drag and drop CSV or Excel files here, or click to browse
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/40 dark:text-white/40">
                Supports .csv · .xlsx · .xls
              </p>
            </div>
          </div>
        </section>

        {/* Step 2: Preview grid */}
        {rows.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="card-sport p-0 overflow-hidden"
          >
            <div className="tape-stripe h-1.5 w-full" />
            <div className="flex flex-col gap-4 border-b-2 border-ink/10 px-5 py-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="eyebrow">Step 2 — Verification</span>
                <h3 className="mt-1 font-display text-base font-extrabold tracking-tight text-ink dark:text-white">
                  Data Verification Grid
                </h3>
                <div className="mt-1.5 flex flex-wrap gap-3">
                  <span className="tag-sport">
                    Parsed: <strong>{rows.length}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/40 bg-lime/10 px-3 py-1 text-xs font-bold text-lime-dark">
                    Valid: {validCount}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                    Errors: {invalidCount}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-3 py-1 text-xs font-bold text-brand dark:border-brand-300/20 dark:bg-brand/10 dark:text-brand-300">
                    To import: {includedCount}
                  </span>
                </div>
              </div>

              <button
                onClick={commitImport}
                disabled={importing || includedCount === 0}
                className="btn-accent px-5 py-2.5 text-xs disabled:opacity-60"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Import {includedCount} Rows
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b-2 border-ink/10 dark:border-white/10">
                    <th className="p-3 text-center w-12 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Import</th>
                    <th className="p-3 text-center w-16 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Status</th>
                    <th className="p-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Date</th>
                    <th className="p-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Time</th>
                    <th className="p-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Name</th>
                    <th className="p-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Phone</th>
                    <th className="p-3 text-right text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Amount</th>
                    <th className="p-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink/50 dark:text-white/50">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((r, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-ink/5 transition-colors dark:border-white/5 ${
                        r.isExcluded
                          ? "opacity-40"
                          : "hover:bg-brand/[0.03] dark:hover:bg-white/[0.03]"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={!r.isExcluded}
                          onChange={() => toggleExclude(idx)}
                          aria-label={`Include row ${r.originalRowIndex}`}
                          className="rounded border-ink/20 bg-white text-brand focus:ring-0 focus:ring-offset-0 dark:border-white/20 dark:bg-[#111c38]"
                        />
                      </td>

                      {/* Validation badge */}
                      <td className="p-3 text-center">
                        {r.isValid ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-lime/40 bg-lime/10 px-2 py-0.5 text-[9px] font-bold text-lime-dark">
                            <Check className="h-3 w-3" aria-hidden /> Valid
                          </span>
                        ) : (
                          <span
                            title={r.validationError || "Invalid row details"}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700 cursor-help dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                          >
                            <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden /> Error
                          </span>
                        )}
                      </td>

                      {/* Data columns */}
                      <td className="p-3 font-semibold text-ink dark:text-white">
                        {r.date || <span className="font-bold text-red-600 dark:text-red-400">??</span>}
                      </td>
                      <td className="p-3 text-ink/70 dark:text-white/70">{r.time}</td>
                      <td className="p-3 max-w-[120px] truncate font-bold text-ink dark:text-white">{r.customer_name}</td>
                      <td className="p-3 text-ink/70 dark:text-white/70">{r.customer_phone}</td>
                      <td className="p-3 text-right font-extrabold text-brand dark:text-brand-300">₹{r.amount}</td>
                      <td className="p-3 max-w-[200px] truncate text-ink/40 dark:text-white/40" title={r.notes || ""}>
                        {r.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length > 100 && (
              <p className="px-5 py-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-ink/40 dark:text-white/40">
                Showing first 100 rows — {rows.length} total parsed
              </p>
            )}
          </motion.section>
        )}

      </div>
    </main>
  );
}
