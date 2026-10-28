try {
  process.loadEnvFile();
} catch {
  // No .env file; the host provides the environment.
}

// Render cron job: asks the web service to run its order checks.
async function main() {
  // On Render the job reaches the web service over the private network.
  const base = process.env.APP_HOSTPORT ? `http://${process.env.APP_HOSTPORT}` : process.env.APP_URL || "";
  const url = `${base.replace(/\/$/, "")}/api/cron`;
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } });
  console.log(res.status, await res.text());
  if (!res.ok) process.exit(1);
}

main();
