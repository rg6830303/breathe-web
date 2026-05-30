"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import { 
  FileSpreadsheet, Upload, Download, Check, AlertCircle, 
  Trash2, ArrowLeft, Loader2, Play, ChevronRight, AlertTriangle 
} from "lucide-react";

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
    
    return { isValid: true, error: null };
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
          validationError: null,
          isExcluded: false
        };

        const validation = validateRowClient(mappedRow);
        mappedRow.isValid = validation.isValid && !dateErr;
        mappedRow.validationError = dateErr ? "Invalid date format." : validation.error;
        
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
      <div className="flex h-screen items-center justify-center bg-[#0B0F19] text-white">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#D4FC34]" />
          <p className="mt-4 text-sm text-white/60">Verifying session credentials...</p>
        </div>
      </div>
    );
  }

  const validCount = rows.filter((r) => r.isValid).length;
  const invalidCount = rows.filter((r) => !r.isValid).length;
  const includedCount = rows.filter((r) => !r.isExcluded).length;

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push("/admin")} 
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-extrabold tracking-wide text-white sm:text-3xl">Ingestion Engine</h1>
              <p className="text-xs text-white/50">Batch import historical spreadsheet bookings directly into Turso database.</p>
            </div>
          </div>
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-[#D4FC34] hover:bg-white/10 transition"
          >
            <Download className="h-4 w-4" /> Download Template
          </button>
        </div>

        {/* Global Alert Messages */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400">
            <Check className="h-5 w-5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Progress indicator */}
        {importing && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wide">
              <span>Importing rows...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#D4FC34] transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Step 1: Upload box */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 mb-8">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
              isDragActive ? "border-[#D4FC34] bg-[#D4FC34]/5" : "border-white/15 bg-white/[0.01] hover:border-white/30"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-[#D4FC34] mb-3" />
            <p className="font-bold text-sm">Drag and drop CSV or Excel files here, or click to browse</p>
            <p className="text-[10px] text-white/40 mt-1 uppercase font-semibold">Supports .csv, .xlsx, .xls</p>
          </div>
        </section>

        {/* Step 2: Spreadsheet Preview Grid */}
        {rows.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4 mb-4">
              <div>
                <h3 className="font-display text-base font-extrabold tracking-wide">Data Verification Grid</h3>
                <div className="flex flex-wrap gap-3 mt-1 text-[11px] font-bold uppercase tracking-wider text-white/50">
                  <span>Parsed: <strong className="text-white">{rows.length}</strong></span>
                  <span className="text-emerald-400">Valid: {validCount}</span>
                  <span className="text-red-400">Errors: {invalidCount}</span>
                  <span className="text-[#D4FC34]">To Import: {includedCount}</span>
                </div>
              </div>

              <button
                onClick={commitImport}
                disabled={importing || includedCount === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4FC34] hover:bg-[#c2e82b] text-gray-900 px-5 py-2.5 font-bold text-xs shadow-soft transition disabled:opacity-60"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Import {includedCount} Rows
              </button>
            </div>

            {/* Scrollable table grid */}
            <div className="overflow-x-auto border border-white/10 rounded-xl bg-[#0B0F19]">
              <table className="w-full min-w-[900px] border-collapse text-left text-xs">
                <thead className="bg-white/5 text-white/60 uppercase font-bold tracking-wider text-[10px] border-b border-white/10">
                  <tr>
                    <th className="p-3 text-center w-12">Import</th>
                    <th className="p-3 text-center w-16">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Time</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {rows.slice(0, 100).map((r, idx) => (
                    <tr 
                      key={idx} 
                      className={`hover:bg-white/[0.01] transition ${
                        r.isExcluded ? "opacity-45 bg-red-950/5" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={!r.isExcluded}
                          onChange={() => toggleExclude(idx)}
                          className="rounded border-white/10 bg-white/5 text-[#D4FC34] focus:ring-0 focus:ring-offset-0"
                        />
                      </td>

                      {/* Verification badge */}
                      <td className="p-3 text-center">
                        {r.isValid ? (
                          <span className="inline-block rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                            Valid
                          </span>
                        ) : (
                          <span 
                            title={r.validationError || "Invalid row details"}
                            className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold text-red-400 cursor-help"
                          >
                            <AlertTriangle className="h-3 w-3 shrink-0" /> Error
                          </span>
                        )}
                      </td>

                      {/* Columns */}
                      <td className="p-3 font-semibold text-white/90">{r.date || <span className="text-red-400 font-bold">??</span>}</td>
                      <td className="p-3 text-white/80">{r.time}</td>
                      <td className="p-3 font-bold text-white truncate max-w-[120px]">{r.customer_name}</td>
                      <td className="p-3 text-white/80">{r.customer_phone}</td>
                      <td className="p-3 text-right font-semibold text-[#D4FC34]">₹{r.amount}</td>
                      <td className="p-3 text-white/45 truncate max-w-[200px]" title={r.notes || ""}>
                        {r.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rows.length > 100 && (
              <p className="text-[10px] text-white/35 text-center mt-3 font-semibold uppercase tracking-wider">
                Showing first 100 rows preview (total {rows.length} rows parsed)
              </p>
            )}
          </motion.section>
        )}
      </div>
    </main>
  );
}
