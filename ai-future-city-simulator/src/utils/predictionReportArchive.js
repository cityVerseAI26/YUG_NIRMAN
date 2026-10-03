export const PREDICTION_REPORT_ARCHIVE_KEY = "yug-nirman-prediction-report-archive";
export const PREDICTION_REPORT_ARCHIVE_EVENT = "yug-nirman-prediction-report-archived";
const REPORT_ARCHIVE_LIMIT = 200;

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

export const deletePredictionReportsForUser = (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return false;

  try {
    const reports = getPredictionReportArchive();
    const remainingReports = reports.filter((entry) => entry.user?.email !== normalizedEmail);
    window.localStorage.setItem(PREDICTION_REPORT_ARCHIVE_KEY, JSON.stringify(remainingReports));
    window.dispatchEvent(new CustomEvent(PREDICTION_REPORT_ARCHIVE_EVENT, {
      detail: { type: "delete-user", email: normalizedEmail },
    }));
    return true;
  } catch {
    return false;
  }
};
