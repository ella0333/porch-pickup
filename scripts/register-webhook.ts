import { registerWebhook } from "../src/lib/paypal";

try {
  process.loadEnvFile();
} catch {
  // No .env file; the host provides the environment.
}

// Registers the PayPal webhook for APP_URL and prints the id to put in PAYPAL_WEBHOOK_ID.
async function main() {
  const url = `${(process.env.APP_URL || "").replace(/\/$/, "")}/api/paypal/webhook`;
  if (!url.startsWith("https://")) throw new Error("APP_URL must be the public https address of the app.");
  const hook = await registerWebhook(url);
  console.log(`Webhook registered. Set PAYPAL_WEBHOOK_ID=${hook.id}`);
}

main().catch((err) => {
  console.error(err.message, err.body ? JSON.stringify(err.body) : "");
  process.exit(1);
});
