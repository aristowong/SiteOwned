document.querySelector("#intake").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form).entries());
  if (data.company_website) return;
  let sent = false;
  try {
    const config = await fetch("../payments-config.json").then((response) => response.json());
    if (config.intakeApi && config.intakeApi.startsWith("https://")) {
      const response = await fetch(config.intakeApi, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      sent = response.ok;
    }
  } catch {
    sent = false;
  }
  if (!sent) {
    const lines = Object.entries(data).filter(([key]) => key !== "company_website").map(([key, value]) => `${key}: ${value}`);
    window.location.href = `mailto:hello@siteowned.ai?subject=${encodeURIComponent("SiteOwned intake")}&body=${encodeURIComponent(lines.join("\n"))}`;
  }
  form.hidden = true;
  document.querySelector("#thanks").hidden = false;
});
