import { getAuthClient } from "./src/auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  const summaryContainer = document.getElementById("submission-summary-container");
  const rawData = sessionStorage.getItem("submissionData");

  if (!summaryContainer) return;
  if (!rawData) {
    summaryContainer.innerHTML = `
      <div class="alert alert-warning text-center">
        <p class="mb-0">No submission data found.</p>
        <p class="mb-0">If you intended to submit a form, please <a href="/" class="alert-link">start here</a>.</p>
      </div>`;
    return;
  }

  try {
    const data = JSON.parse(rawData);
    const card = document.createElement("div");
    card.className = "card summary-card bg-light p-3 mt-4";

    const title = document.createElement("h5");
    title.className = "card-title mb-3";
    title.textContent = "Application Summary";
    card.appendChild(title);

    const status = document.createElement("div");
    status.className = "alert alert-info";
    status.id = "application-status-summary";
    status.textContent = `Application ${data["submission-id"] || ""} was received. Status: ${data["application-status"] || "captured"}.`;
    card.appendChild(status);

    const list = document.createElement("dl");
    list.className = "row";
    const fields = ["submission-id","full-name","email","phone","country","dob","gender","branch","group","artist","payment-type","payment-method","contact-method"];
    fields.forEach((key) => {
      if (!data[key]) return;
      const dt = document.createElement("dt");
      dt.className = "col-sm-4 summary-key";
      dt.textContent = key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const dd = document.createElement("dd");
      dd.className = "col-sm-8 summary-value";
      dd.textContent = data[key];
      list.append(dt, dd);
    });
    card.appendChild(list);
    summaryContainer.appendChild(card);

    try {
      const { data: sessionData } = await getAuthClient().auth.getSession();
      const session = sessionData?.session;
      if (session?.access_token && data["submission-id"]) {
        const response = await fetch("/application-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ reference: data["submission-id"], action: "read" }),
          signal: AbortSignal.timeout(12000),
        });
        const server = await response.json().catch(() => ({}));
        if (response.ok && server?.success) {
          status.textContent = `Application ${server.reference} was received. Status: ${server.status}.`;
          status.dataset.authoritative = "true";
        } else {
          status.textContent += " Server verification is temporarily unavailable.";
        }
      }
    } catch {
      status.textContent += " Server verification is temporarily unavailable.";
    }

    sessionStorage.removeItem("submissionData");
  } catch (error) {
    console.error("Error parsing or displaying submission data:", error);
    summaryContainer.textContent = "Could not display the application summary.";
  }
});
