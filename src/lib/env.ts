// Read lazily so scripts that load .env after importing still see the values.
export const env = {
  get appUrl() {
    return (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  get demo() {
    return process.env.DEMO_MODE === "true";
  },
  get paypalEnv() {
    return process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
  },
  get paypalClientId() {
    return process.env.PAYPAL_CLIENT_ID || "";
  },
  get paypalClientSecret() {
    return process.env.PAYPAL_CLIENT_SECRET || "";
  },
  get paypalWebhookId() {
    return process.env.PAYPAL_WEBHOOK_ID || "";
  },
  get openrouterKey() {
    return process.env.OPENROUTER_API_KEY || "";
  },
  get openrouterModel() {
    return process.env.OPENROUTER_MODEL || "meta-llama/llama-4-scout";
  },
  get channel3Key() {
    return process.env.CHANNEL3_API_KEY || "";
  },
  get ebayClientId() {
    return process.env.EBAY_CLIENT_ID || "";
  },
  get ebayClientSecret() {
    return process.env.EBAY_CLIENT_SECRET || "";
  },
  get cronSecret() {
    return process.env.CRON_SECRET || "";
  },
};
