// success.js
// Renders the submission summary stored in sessionStorage on success.html.
//
// Extracted from an inline <script> block so the page ships no inline
// JavaScript and the Content-Security-Policy can stay strict
// (script-src 'self' https://cdn.jsdelivr.net). Loaded as a module via
// <script type="module" src="success.js"></script> - module scripts run
// after the document is parsed, and the DOMContentLoaded guard below keeps
// behavior identical to the original inline script.
//
// Security notes:
//  - All rendered values are written with textContent (no innerHTML from
//    user data), so stored XSS payloads cannot execute here.
//  - sessionStorage["submissionData"] is cleared after rendering so the
//    PII does not linger in the browser profile.

document.addEventListener("DOMContentLoaded", () => {
  const summaryContainer = document.getElementById(
    "submission-summary-container",
  );
  const rawData = sessionStorage.getItem("submissionData");

  if (rawData && summaryContainer) {
    try {
      const data = JSON.parse(rawData);

      const card = document.createElement("div");
      card.className = "card summary-card bg-light p-3 mt-4";

      const title = document.createElement("h5");
      title.className = "card-title mb-3";
      title.textContent = "Your Submission Summary";
      card.appendChild(title);

      const list = document.createElement("dl");
      list.className = "row";

      // A helper function to format keys into readable labels
      const formatKey = (key) => {
        return key
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
      };

      // Define which fields to display and in what order
      const fieldsToDisplay = [
        "submission-id",
        "full-name",
        "email",
        "phone",
        "country",
        "dob",
        "gender",
        "branch",
        "group",
        "artist",
        "payment-type",
        "payment-method",
        "contact-method",
      ];

      fieldsToDisplay.forEach((key) => {
        if (data[key]) {
          const dt = document.createElement("dt");
          dt.className = "col-sm-4 summary-key";
          dt.textContent = formatKey(key);

          const dd = document.createElement("dd");
          dd.className = "col-sm-8 summary-value";
          dd.textContent = data[key];

          list.appendChild(dt);
          list.appendChild(dd);
        }
      });

      card.appendChild(list);
      summaryContainer.appendChild(card);

      // Clear the data from session storage for security
      sessionStorage.removeItem("submissionData");
    } catch (error) {
      console.error(
        "Error parsing or displaying submission data:",
        error,
      );
      summaryContainer.innerHTML =
        '<p class="text-danger">Could not display submission summary due to an error.</p>';
    }
  } else if (summaryContainer) {
    // Handle case where user lands here directly
    summaryContainer.innerHTML = `
      <div class="alert alert-warning text-center">
        <p class="mb-0">No submission data found.</p>
        <p class="mb-0">If you intended to submit a form, please <a href="/" class="alert-link">start here</a>.</p>
      </div>
    `;
  }
});

