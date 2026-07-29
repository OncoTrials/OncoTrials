const STATUS_LABELS = {
  recruiting: "Recruiting",
  not_yet_recruiting: "Not Yet Recruiting",
  active_not_recruiting: "Active Not Recruiting",
  enrolling_by_invitation: "Enrolling By Invitation",
  completed: "Completed",
};

export const convertStatus = (status) => {
  if (!status) return "Unavailable";
  const key = status.toLowerCase();
  if (STATUS_LABELS[key]) return STATUS_LABELS[key];
  // A present-but-unrecognized status still describes the trial — render it
  // title-cased rather than the misleading "Unavailable".
  return key
    .split(/[_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const getStatusColor = (status) => {
  if (!status) return "bg-red-100 text-red-700";
  switch (status.toLowerCase()) {
    case "recruiting":
      return "bg-green-100 text-green-700";
    case "not_yet_recruiting":
      return "bg-yellow-100 text-yellow-700";
    case "active_not_recruiting":
      return "bg-gray-100 text-gray-600";
    case "enrolling_by_invitation":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-red-100 text-red-700";
  }
};

export const getStatusDot = (status) => {
  if (!status) return "bg-red-400";
  switch (status.toLowerCase()) {
    case "recruiting":
      return "bg-green-500 animate-pulse";
    case "not_yet_recruiting":
      return "bg-yellow-500";
    case "active_not_recruiting":
      return "bg-gray-400";
    case "enrolling_by_invitation":
      return "bg-blue-500 animate-pulse";
    default:
      return "bg-red-400";
  }
};

export const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

export const getMatchStyle = (match) => {
  switch (match?.status) {
    case "likely_eligible":
      return {
        bar: "bg-green-400",
        badge: "bg-green-100 text-green-700 border-green-200",
        text: "Likely Eligible",
      };
    case "eligible":
      return {
        bar: "bg-green-400",
        badge: "bg-green-100 text-green-700 border-green-200",
        text: "Eligible",
      };
    case "needs_review":
      return {
        bar: "bg-amber-400",
        badge: "bg-amber-100 text-amber-700 border-amber-200",
        text: "Needs Review",
      };
    case "not_eligible":
      return {
        bar: "bg-red-400",
        badge: "bg-red-100 text-red-700 border-red-200",
        text: "Not Eligible",
      };
    default:
      return { bar: "bg-sky-200", badge: "", text: "" };
  }
};

export const cleanEligibilitySummary = (summary) => {
  if (!summary) return "";
  return summary.replace(/##\s*/g, "").trim();
};

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "ending-soon", label: "Ending Soonest" },
  { value: "az", label: "A → Z" },
  { value: "za", label: "Z → A" },
];

// Option values are the canonical SCREAMING_SNAKE_CASE forms the database
// stores (from ClinicalTrials.gov). Backend consumers — trialRanker's
// OPEN_STATUSES, the importer's CLOSED_STATUSES — compare exactly, so saving
// a lowercase status would silently drop the trial from match results.
export const STATUS_OPTIONS = [
    { value: "RECRUITING", label: "Recruiting" },
    { value: "NOT_YET_RECRUITING", label: "Not Yet Recruiting" },
    { value: "ACTIVE_NOT_RECRUITING", label: "Active Not Recruiting" },
    { value: "ENROLLING_BY_INVITATION", label: "Enrolling By Invitation" },
    { value: "COMPLETED", label: "Completed" },
];
