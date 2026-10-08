export const PREDICTION_REPORT_ARCHIVE_KEY = "yug-nirman-prediction-report-archive";
export const PREDICTION_REPORT_ARCHIVE_EVENT = "yug-nirman-prediction-report-archived";
const REPORT_ARCHIVE_LIMIT = 200;
const REPORT_DOCUMENT_DB = "yug-nirman-report-documents";
const REPORT_DOCUMENT_STORE = "pdfs";

const openReportDocumentDb = () => new Promise((resolve, reject) => {
  if (!("indexedDB" in window)) {
    reject(new Error("Browser file storage is unavailable; the PDF cannot be archived."));
    return;
  }
  const request = window.indexedDB.open(REPORT_DOCUMENT_DB, 1);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(REPORT_DOCUMENT_STORE)) {
      database.createObjectStore(REPORT_DOCUMENT_STORE);
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error("Could not open browser file storage."));
});

const storePdfDocument = async (id, blob) => {
  const database = await openReportDocumentDb();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(REPORT_DOCUMENT_STORE, "readwrite");
    transaction.objectStore(REPORT_DOCUMENT_STORE).put(blob, id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Could not store the PDF document."));
    transaction.onabort = () => reject(transaction.error || new Error("PDF storage was interrupted."));
  }).finally(() => database.close());
};

const removePdfDocument = async (id) => {
  const database = await openReportDocumentDb();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(REPORT_DOCUMENT_STORE, "readwrite");
    transaction.objectStore(REPORT_DOCUMENT_STORE).delete(id);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Could not remove the archived PDF."));
    transaction.onabort = () => reject(transaction.error || new Error("PDF removal was interrupted."));
  }).finally(() => database.close());
};

export const getArchivedReportPdf = async (id) => {
  const database = await openReportDocumentDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(REPORT_DOCUMENT_STORE, "readonly")
        .objectStore(REPORT_DOCUMENT_STORE)
        .get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Could not read the archived PDF."));
    });
  } finally {
    database.close();
  }
};

export const getPredictionReportArchive = () => {
  try {
    const reports = JSON.parse(window.localStorage.getItem(PREDICTION_REPORT_ARCHIVE_KEY) || "[]");
    return Array.isArray(reports) ? reports : [];
  } catch {
    return [];
  }
};

export const archivePredictionReport = (report, user, exportFormat) => {
  if (!report || user?.authType !== "user" || !user.email) return false;

  try {
    const copy = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      exportedAt: new Date().toISOString(),
      exportFormat: ["pdf", "csv", "json"].includes(exportFormat) ? exportFormat : "report",
      user: {
        id: user.id ?? null,
        name: String(user.name || user.email).trim(),
        email: String(user.email).trim().toLowerCase(),
        role: String(user.role || "User").trim(),
      },
      report: JSON.parse(JSON.stringify(report)),
    };
    const reports = [copy, ...getPredictionReportArchive()].slice(0, REPORT_ARCHIVE_LIMIT);
    window.localStorage.setItem(PREDICTION_REPORT_ARCHIVE_KEY, JSON.stringify(reports));
    window.dispatchEvent(new CustomEvent(PREDICTION_REPORT_ARCHIVE_EVENT, { detail: copy }));
    return true;
  } catch {
    return false;
  }
};

export const archiveCityIntelligencePdf = async (report, user, pdfBlob, filename) => {
  if (!report || user?.authType !== "user" || !user.email) {
    throw new Error("Sign in with a user account to save this PDF in the Admin archive.");
  }
  if (!(pdfBlob instanceof Blob) || pdfBlob.size === 0) {
    throw new Error("The generated PDF is empty and cannot be archived.");
  }

  const id = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry = {
    id,
    archivedDocument: true,
    documentType: "city-intelligence-pdf",
    filename,
    exportedAt: new Date().toISOString(),
    exportFormat: "pdf",
    user: {
      id: user.id ?? null,
      name: String(user.name || user.email).trim(),
      email: String(user.email).trim().toLowerCase(),
      role: String(user.role || "User").trim(),
    },
    report: {
      city: String(report.city?.name || report.city || "Unknown city"),
      reportId: report.metadata?.reportId || "Unavailable",
      timestamp: report.timestamp || null,
      completenessPercent: report.dataCoverage?.completenessPercent ?? null,
    },
  };

  await storePdfDocument(id, pdfBlob);
  try {
    const reports = [entry, ...getPredictionReportArchive()].slice(0, REPORT_ARCHIVE_LIMIT);
    window.localStorage.setItem(PREDICTION_REPORT_ARCHIVE_KEY, JSON.stringify(reports));
    window.dispatchEvent(new CustomEvent(PREDICTION_REPORT_ARCHIVE_EVENT, { detail: entry }));
    return entry;
  } catch (error) {
    await removePdfDocument(id);
    throw new Error(error instanceof Error
      ? `PDF saved for download but could not be listed in the Admin archive: ${error.message}`
      : "PDF saved for download but could not be listed in the Admin archive.");
  }
};

export const deletePredictionReportsForUser = (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return false;

  try {
    const reports = getPredictionReportArchive();
    const remainingReports = reports.filter((entry) => entry.user?.email !== normalizedEmail);
    window.localStorage.setItem(PREDICTION_REPORT_ARCHIVE_KEY, JSON.stringify(remainingReports));
    reports
      .filter((entry) => entry.user?.email === normalizedEmail && entry.archivedDocument)
      .forEach(({ id }) => {
        removePdfDocument(id).catch(() => {
          window.dispatchEvent(new CustomEvent(PREDICTION_REPORT_ARCHIVE_EVENT, {
            detail: { type: "document-cleanup-failed", id },
          }));
        });
      });
    window.dispatchEvent(new CustomEvent(PREDICTION_REPORT_ARCHIVE_EVENT, {
      detail: { type: "delete-user", email: normalizedEmail },
    }));
    return true;
  } catch {
    return false;
  }
};
