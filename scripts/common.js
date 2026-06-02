window.onerror = function (message, source, lineno, colno, error) {
    console.warn("Global Error Captured:");
    
    const errorDetails = {
      message: message,
      source: source,
      line: lineno,
      column: colno,
      stack: error ? error.stack : null
    };

    reportErrorToService(errorDetails);

    return false; 
  };

  window.addEventListener("unhandledrejection", function (event) {
    console.warn("Unhandled Promise Rejection Captured:");

    const errorDetails = {
      message: event.reason?.message || event.reason,
      stack: event.reason?.stack || null,
      type: "PromiseRejection"
    };

    reportErrorToService(errorDetails);
  });

  function reportErrorToService(data) {
    console.log("Sending data to external log:", data);
  }