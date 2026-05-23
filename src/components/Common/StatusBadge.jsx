const STATUS_COLORS = {
  Planned: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Pending: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Completed: "bg-green-500/20 text-green-400 border-green-500/30",
  Closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const RESULT_COLORS = {
  TP: "bg-green-500/20 text-green-400 border-green-500/30",
  FP: "bg-red-500/20 text-red-400 border-red-500/30",
  Undetermined: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export const StatusBadge = ({ status }) => (
  <span
    className={`px-2 py-1 rounded-full text-xs 
    border font-medium ${STATUS_COLORS[status] || ""}`}
  >
    {status}
  </span>
);

export const ResultBadge = ({ result }) => {
  if (!result) return null;
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs 
      border font-medium ${RESULT_COLORS[result] || ""}`}
    >
      {result}
    </span>
  );
};
