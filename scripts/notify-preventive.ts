import { runPreventiveReminders } from "../src/lib/gmao/preventive-reminders";

async function main() {
  const result = await runPreventiveReminders();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
