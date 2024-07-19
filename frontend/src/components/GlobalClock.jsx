import React, { useState, useEffect } from "react";

function GlobalClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const formatTimeAsUTC = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: "UTC",
    }).format(date);
  };

  return (
    <div style={{ color: "white" }}>
      <div>UTC Time: {formatTimeAsUTC(currentTime)}</div>
    </div>
  );
}

export default GlobalClock;
