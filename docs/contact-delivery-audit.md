# Contact and delivery audit — 20 October 2026

All owner-bound requests now route to **bearlane01@gmail.com**. Customer confirmations, password resets, verification codes and requested chat transcripts still go to the customer. Replies to customer-facing emails go to the owner; replies to owner request emails go to the customer when their email is known.

## Contact/request inventory

| Area | Path or submission | Result |
| --- | --- | --- |
| Footer “Contact us” | `/support` | Opens the working support form. |
| Support page “Email support” | `/support` | Opens `mailto:bearlane01@gmail.com`; formerly a hard-coded, different address. |
| Support form | `POST /support/messages` | Saves the message and queues an owner email including the full message and customer Reply-To. |
| Help centre, help articles, all help topics (orders, returns, account, payments, technical and privacy) | Links to `/support` and `/help/livechat` | Uses the same support and chat flows. |
| Order-details support link | `/support` | Uses the same support form. |
| Older Home / AppLayout / Projects “Contact” links | `/contact` | Redirects to `/support`; previously a missing route. |
| Product “Email My Quote” | `POST /api/send-quote` | Now also notifies the owner, while preserving the customer quote. |
| Instant quote tool | `POST /api/instant-quote` | Queues the quote details to the owner and sends the customer their quote. |
| “Speak to a Print Specialist” | `POST /api/quote-request` | Saves the request; emails the owner details, contact information and uploaded-image links. |
| Live chat, attachments and AI handover | `/livechat/message`, `/livechat/upload` | Emails actual customer messages/attachments and handover context, including guest chats. |
| Legacy chat submission | `/api/chat/send` | Also emails customer messages to the owner. |
| FAQ requests | `POST /help/faq-requests` | Emails the question, details and signed-in customer's email. |
| Return requests | `/orders/{order}/returns` | Emails the request, reason and customer contact information. |
| Additional return evidence / return marked sent | `more-evidence`, `mark-sent` | Now notifies the owner about these follow-ups too. |
| Product restock requests | `/product/{slug}/notify-restock` | Saves the subscription and notifies the owner of product, size, colour and customer. |
| Footer “Subscribe” | `POST /newsletter/requests` | Previously did nothing. Now saves a subscription request with consent and emails the owner; repeat submissions are deduplicated. This requests inclusion on the mailing list; it does not launch a marketing campaign. |
| Invoice PDF support address | Invoice template | New/generated invoices use the owner inbox. Previously generated PDF files and already-sent emails retain their historical contents. |
| Email footers and replies | Shared mail configuration/template | Uses the owner inbox. |
| Other owner notifications | Orders, reviews, signups, administrative events | Routes to this inbox rather than enumerating admin-account email addresses. Optional non-request alerts retain their notification preferences. |

Customer requests and order emails cannot be disabled by optional notification toggles. The existing database queue and production worker deliver them, retry temporary provider errors five times with backoff, and preserve exhausted failures in `failed_jobs`. Successful owner sends log a Resend provider ID for delivery investigation. Production already uses Resend with `no-reply@bear-lane.com`; the Gmail address is the recipient, not a forged sender.

## Delivery causes and fixes

- Product delivery text was hard-coded and advertised disabled DPD services and unimplemented free delivery over £50. Product, cart and help delivery summaries now use saved methods, prices, carrier names and estimated times. Removed the misleading £50 progress bar and free-delivery homepage promise.
- Preset measurements were copied into product variants and persisted carts. Current preset/product data now takes precedence for product pages, carrier quotes and labels; manual and removed presets retain their recorded measurements.
- Unknown or disabled presets could silently select a different carrier's first parcel. That fallback has been removed. Product editors refresh parcel settings when returning from the delivery settings tab.
- Parcel estimates silently capped length at 120cm and weight at 60kg. They now send actual measurements to the carrier for eligibility checks.
- Disabled/deleted carriers were not consistently excluded from timed delivery and label selection. They now share the enabled-carrier filter and respect pinned services.
- Disabling every method was rejected only after saving it. Validation now happens before writing, and requires at least one usable method.
- Live pricing could silently fall back to a fixed price when no rate existed. Such options now show as unavailable.
- Checkout did not refresh ordinary delivery options, and skipped timed-price updates. It refreshes on focus and periodically, updates all selected prices, clears disabled options and ignores older overlapping responses.
- The delivery API now reads the signed-in session so membership pricing agrees with checkout.
- Payment creation accepted stale/client-supplied shipping prices and unavailable methods. It now checks current availability and price; changed prices require the customer to review before paying.
- The accepted delivery quote is recorded on the payment and preserved when recording the paid order, even if settings change in between.
- Timed labels were created before order items existed, so they used a default parcel. They are now created after the items are saved.

## Verification

- 22 focused tests / 114 assertions pass for owner routing, contact/quote/chat/FAQ/restock/newsletter requests, reply-to headers, real queue retry, delivery edits, product presets, saved-cart overrides, carrier restrictions, membership, payment repricing and preserving paid delivery quotes.
- Production frontend build passes.
- Full suite: 62 passed, 22 failed. The same 22 failures reproduce on the original HEAD (authentication/profile/legacy CAPTCHA expectations); no new failing tests.
- Production web and worker deployments and a live support-form delivery check are recorded below after release verification.
