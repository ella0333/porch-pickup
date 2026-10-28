import { db } from "../src/lib/db";
import { seedDemo } from "../src/lib/demo";

try {
  process.loadEnvFile();
} catch {
  // No .env file; the host provides the environment.
}

// Seeds the demo town. Without --force it only runs on an empty database,
// so it is safe to call on every deploy.
async function main() {
  const force = process.argv.includes("--force");
  if (!force && (await db.user.count()) > 0) {
    console.log("Database already has data, skipping the demo seed.");
    return;
  }
  await seedDemo();
  console.log("Demo town seeded.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
