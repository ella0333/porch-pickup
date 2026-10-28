# How Porch Pickup works

## The problem

Porch pickup solves no-shows: the seller leaves the item outside and the buyer comes whenever. It also forces two leaps of trust. The seller gives their home address to a stranger who may never come, and the buyer is trusted to leave cash under the mat or send a payment app transfer. Porch Pickup puts PayPal in the middle so neither side has to trust the other.

## The sale, step by step

1. The seller sets up their pickup spot once: the address, where on the porch the item will be, the days they are around, and the hours pickups are allowed. They also choose to be paid to PayPal or Venmo.
2. The seller uploads photos. The AI writes the listing and suggests a price (see below). The seller edits anything and posts.
3. Buyers browse by distance. Distances are measured to a point moved randomly up to 400 meters from the house, and maps only show a circle around that point, so nobody can work out the address.
4. The buyer picks a one-hour pickup slot inside the seller's window and pays with PayPal or Venmo. This only places a hold on their money.
5. The seller has 12 hours to confirm. Confirming shares the address, porch instructions and any note with that buyer. Declining, or not answering, cancels the hold.
6. At the porch the buyer taps "Got it". The app captures the held payment and sends the seller their money through PayPal Payouts. If the buyer taps nothing at all, the buyer gets a reminder 24 hours after the pickup time, and the payment goes to the seller 72 hours after it.
7. If the item isn't there, the buyer taps "Not there" (after messaging the seller, ideally). The seller has 24 hours to contest. If they don't, the hold is cancelled and the buyer is never charged. If they do, an admin reviews both sides and either pays the seller or cancels the hold.
8. Both sides review each other. Anyone can report a user or listing, and admins can ban users. Banning cancels that user's open sales and releases every hold.

## PayPal

Every PayPal call is in src/lib/paypal.ts.

The buy button uses PayPal's JavaScript SDK v6 with the PayPal and Venmo payment sessions. In the sandbox the SDK is created with the buyer country set to US, which is what makes the Venmo button appear.

Orders are created with the AUTHORIZE intent instead of CAPTURE (Orders v2). When the buyer approves, the server authorizes the order, which puts a hold on the funds.

"Got it" captures the authorization (Payments v2). Decline, cancel, expiry and uncontested reports all void it, so the buyer is never charged.

PayPal guarantees a hold for 3 days and allows it to be reauthorized from day 4 to day 29. The cron job reauthorizes any hold that is still open after 3 days, which is why pickups can be booked up to 28 days out.

Sellers are paid with the Payouts API, to the PayPal email or the Venmo phone number or handle they chose at setup. The sandbox does not accept phone number payouts, so the demo sellers are paid to sandbox PayPal accounts.

A PayPal webhook keeps orders in sync when a hold is voided outside the app and records the final payout status. Events are only applied after PayPal verifies their signature.

## AI

The listing helper is in src/lib/ai.ts and src/lib/pricing.ts.

The photos go to Llama 4 Scout, Meta's open-weight vision model, through OpenRouter, routed to the cheapest provider that serves it. It returns structured JSON with a title, a description, a category, the brand and model if readable, a condition grade (new, like new, good, fair or poor), a list of visible flaws, and a short eBay-style search phrase. A listing costs a fraction of a cent. Because the model is open-weight, a real platform could later host it itself.

The price comes from the condition grade plus market prices, looked up at the same time.

Channel3 image search sends the main photo and gets back matching products with their offers, both new retail offers and used or pre-owned offers from resale sites. For the new price, the app takes the median of the lowest new price across the top three matches. The used offers across the top five matches give the 25th, 50th and 75th percentiles of used prices.

The eBay Browse API is supported as an optional extra source of used prices. When eBay keys are set, it searches current US fixed-price used listings with the AI's search phrase, drops the top and bottom 10 percent, and its percentiles are used instead of Channel3's.

The grade picks the price. Like new uses the 75th percentile of the used prices, good uses the median, fair uses the 25th percentile, and poor uses 60 percent of the 25th percentile. A new item uses 85 percent of the retail price. Every price is capped at 85 percent of the retail price and rounded to a price people actually ask. With no used prices found, the price is a share of the retail price: 70 percent for like new, 55 for good, 40 for fair and 25 for poor. If neither source finds anything, a second short model call estimates a price from the photo. The seller always sees a one-line reason with the numbers, and can change everything.

## Tools used

PayPal Orders v2, Payments v2 (authorize, capture, void, reauthorize), Payouts and Webhooks, and the PayPal JavaScript SDK v6 with Venmo.

Llama 4 Scout through OpenRouter, for the listing text and condition grade, and as the price fallback.

Channel3 image search, for new and used prices.

eBay Browse API, optional, for more used asking prices.

OpenStreetMap, through Nominatim for address lookup and its map tiles with Leaflet.

Next.js, Prisma and Postgres, hosted on Render with a cron job.
