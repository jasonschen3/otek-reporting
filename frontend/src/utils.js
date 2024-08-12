// Date helpers
const parseDate = (dateString) => {
  return new Date(dateString);
};

const isSameDay = (date1, date2) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Formats url of input
export const formatUrl = (url) => {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `http://${url}`;
  }
  return url;
};

// Renders end_date or yesterday/today
export const checkYesterdayTodayRender = (project) => {
  // 0) Render nothing but view all since completed
  if (project.project_status === 2) {
    return 0;
  }
  // 1) Render everything
  if (project.end_date === null) {
    return 1;
  }
  const startDate = parseDate(project.start_date);
  const endDate = parseDate(project.end_date);
  // 2) 1 day project so render only that day
  if (project.start_date !== null && isSameDay(startDate, endDate)) {
    return 2;
  }
  const today = new Date();
  // 3) If today is after end_date, then render only the last 2 days
  if (today > endDate) {
    return 3;
  }
  return 1;
};

export const getProjectStatus = (status) => {
  switch (status) {
    case 1:
      return "Ongoing";
    case 2:
      return "Completed";
    case 3:
      return "Bill Submitted";
    case 4:
      return "To Be Submitted";
    case 5:
    default:
      return "All";
  }
};

export const formatMoney = (amount) => {
  if (!amount || isNaN(amount)) {
    return "";
  }

  const parts = Number(amount).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Remove the trailing ".00" if the amount is an integer
  if (parts[1] === "00") {
    return `$${parts[0]}`;
  }

  return `$${parts.join(".")}`;
};

export const getPermissionLevelText = (level) => {
  switch (level) {
    case 0:
      return "View Only";
    case 1:
      return "Upload Only";
    case 2:
      return "Admin";
    default:
      return "Unknown";
  }
};
