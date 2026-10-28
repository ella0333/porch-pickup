# Porch Pickup

Porch Pickup is an easy local marketplace for buying and selling with porch pickup. Your payment is held safely until you pick up the item, so buyers never pay for something that isn't there and sellers know the buyer is serious before sharing their address.

Selling is quick too. Snap a few photos and AI writes the listing and suggests a fair price based on the item's condition.

How the payment hold, payouts, AI and pricing work is explained in HOW-IT-WORKS.md.

## Try the hosted demo

Demo URL: https://porch-pickup.onrender.com

Pick a demo buyer from the menu at the top right, open any listing, choose a pickup time, and pay with the PayPal sandbox buyer below. Then switch to the seller named on the listing to confirm the sale, and switch back to the buyer to tap "Got it".

PayPal sandbox buyer login: sb-ita2n53484618@personal.example.com with password 2hEf/Prg

Payments in the demo use the PayPal sandbox, so no real money moves. The demo town and its addresses are fictional.

## Run it yourself

You need Node 20.9 or newer and Docker (for the local Postgres database).

1. Copy .env.example to .env and fill in the keys. The comments in the file say where each key comes from. The eBay keys are optional.
2. Start the database with `docker compose up -d`.
3. Install and set up with `npm install`, then `npx prisma db push`, then `npm run db:seed`.
4. Start the app with `npm run dev` and open http://localhost:3000.

To run the order checks that a deployed app runs every 5 minutes (expired holds, uncontested reports, hold renewals), run `npm run cron` while the app is running.

`npm run db:reset-demo` wipes the database and restores the demo town.

## Deploy on Render

The render.yaml blueprint creates the web service, a Postgres database and a cron job that runs every 5 minutes. In the Render dashboard, choose New, then Blueprint, pick this repository, and paste the values for the keys marked as secret.

After the first deploy, register the PayPal webhook by running `npm run paypal:webhook` with APP_URL set to the Render URL. Put the printed id in the PAYPAL_WEBHOOK_ID setting on Render.

## Keys

PayPal sandbox REST app with Payouts turned on, from developer.paypal.com.

OpenRouter API key, from openrouter.ai.

Channel3 API key, from trychannel3.com/developers.

eBay production keyset, from developer.ebay.com. This one is optional and adds eBay's used listings to the price data.

## License

MIT. The demo photos keep their own licenses, listed in prisma/demo-photos/CREDITS.md.
