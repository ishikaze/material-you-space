window.onerror = function (message, source, lineno, colno, error) {
    console.warn("Global Error Captured:");
    
    const errorDetails = {
      message: message,
      source: source,
      line: lineno,
      column: colno,
      stack: error ? error.stack : null
    };

    // Replace this with your logging logic
    reportErrorToService(errorDetails);

    // Return true to prevent the error from printing in the browser console
    return false; 
  };

  // 2. Catch unhandled Promise rejections (failed fetch requests, async/await errors)
  window.addEventListener("unhandledrejection", function (event) {
    console.warn("Unhandled Promise Rejection Captured:");

    const errorDetails = {
      message: event.reason?.message || event.reason,
      stack: event.reason?.stack || null,
      type: "PromiseRejection"
    };

    // Replace this with your logging logic
    reportErrorToService(errorDetails);
  });

  // Mock function for processing the error
  function reportErrorToService(data) {
    console.log("Sending data to external log:", data);
  }