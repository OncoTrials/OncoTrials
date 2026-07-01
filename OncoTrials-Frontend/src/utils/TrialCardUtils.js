export const convertStatus = (status) => {
  if (!status) return "Unavailable";
  switch (status.toLowerCase()) {
    case "recruiting":
      return "Recruiting";
    case "not_yet_recruiting":
      return "Not Yet Recruiting";
    case "active_not_recruiting":
      return "Active Not Recruiting";
    case "enrolling_by_invitation":
      return "Enrolling By Invitation";
    default:
      return "Unavailable";
  }
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

const STATUS_OPTIONS = [
    { value: "recruiting", label: "Recruiting" },
    { value: "not_yet_recruiting", label: "Not Yet Recruiting" },
    { value: "active_not_recruiting", label: "Active Not Recruiting" },
    { value: "enrolling_by_invitation", label: "Enrolling By Invitation" },
    { value: "completed", label: "Completed" },
];
