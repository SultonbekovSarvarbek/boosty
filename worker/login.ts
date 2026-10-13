// Одноразовый вход служебным аккаунтом Telegram, чтобы получить строку сессии для TG_SESSION.
// Запуск: npm run stats:login
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import readline from "readline/promises";

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH || "";
if (!apiId || !apiHash) throw new Error("Сначала укажите TG_API_ID и TG_API_HASH в .env");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const client = new TelegramClient(new StringSession(""), apiId, apiHash, { connectionRetries: 5 });

(async () => {
  await client.start({
    phoneNumber: () => rl.question("Телефон служебного аккаунта (+998…): "),
    phoneCode: () => rl.question("Код из Telegram: "),
    password: () => rl.question("Пароль 2FA (если есть): "),
    onError: (e) => console.error(e),
  });
  console.log("\nСкопируйте эту строку в TG_SESSION:\n");
  console.log(client.session.save());
  rl.close();
  await client.disconnect();
  process.exit(0);
})();
