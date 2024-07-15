import React, { useState, useEffect } from "react";

function GlobalClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const formatTime = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: "America/Chicago", // Central time for Texas
    }).format(date);
  };

  return (
    <div style={{ color: "white" }}>US Central: {formatTime(currentTime)}</div>
  );
}

export default GlobalClock;
