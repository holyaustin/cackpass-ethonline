# CACK-pass — Continuity Track Submission

**Decentralized Event Ticketing Platform — Now Settling Every Ticket as USDC on Arc**

- **Live demo:** https://cackpass-ethonline.vercel.app/
- **Video walkthrough:** https://youtu.be/ZiU2gWjEjvU
- **GitHub:** https://github.com/holyaustin/cackpass-ethonline

---

## 🎯 Submission Summary (Continuity Track)

CACK-pass is a Web2/Web3 hybrid event ticketing platform. It had a working foundation before this hackathon (Privy auth, Lisk-based smart contracts, gasless minting, IPFS ticket storage, Paystack fiat).

**This is a migration project — not a hackathon stunt.** Lisk Mainnet is scheduled for deprecation in a few weeks, and **Arc is our chosen destination for CACK-pass going forward**. Arc's native-USDC gas model, fast finality, and Circle-native rails make it a strong long-term home for a ticketing platform that wants zero-gas UX for buyers and an auditable on-chain record for organizers. During this hackathon we laid the first production-grade step of that migration and shipped a working multi-rail payment stack on Arc.

### What we shipped during this hackathon

1. **Migrated fiat from Paystack → Flutterwave** (card / USSD / bank / mobile money) with inline checkout and webhook-backed verification.
2. **Deployed a new on-chain payment contract on Arc** — `CackPassArcPayment.sol`, written, tested, and deployed in a new **`arc-contracts/` Hardhat project**. It records every ticket payment on-chain and is the forward path for the CackPass contract suite.
3. **Integrated Arc Testnet for native USDC ticket payments** — Circle App Kit drives the USDC transfer; `CackPassArcPayment` provides the on-chain proof; users pay the ticket **and gas entirely in USDC**.
4. **Added Privy Fiat Onramp (Base Mainnet)** — buyers can purchase real USDC with a card in NGN / USD / EUR / GBP directly into their embedded wallet.
5. **Redesigned the wallet dashboard** — dual-network view (Arc default + Base onramp), live balances, sends, QR receive, and transaction history.

### Our migration commitment to Arc

- **v1 (shipped now):** `CackPassArcPayment` live on Arc Testnet, recording every payment on-chain.
- **v2 (at Arc Mainnet launch):** Full CackPass contract suite (`CackPassCore`, `TicketMarket`, `RoyaltyEngine`, `WhitelistManager`, `VoucherVerifier`, `TicketFactory`, plus a mainnet version of `CackPassArcPayment`) deployed on Arc Mainnet.
- **Gasless UX at Mainnet:** Move from the current backend-signed relayer to **Privy-sponsored / Circle-sponsored transactions** at Arc Mainnet launch, so users never touch a separate gas token.
- **Lisk retirement:** Once v2 is live on Arc Mainnet, we retire Lisk env vars, contract addresses, and RPC endpoints.

**CACK-pass is committed to Arc as its long-term chain.**

---

## 🔄 Continuity: What Existed vs. What We Shipped

### ✅ What Existed Before This Hackathon (Legacy — Lisk path, being retired)

> ⚠️ **Lisk Mainnet is scheduled for deprecation in a few weeks.** The Lisk contracts below are legacy and are being replaced by the new Arc contract suite. We list them only for continuity context; the hackathon work is on Arc.

- Passwordless auth via **Privy** (email / Google / Twitter) with embedded wallets
- On-chain ticketing contracts on **Lisk** (`CackPassCore`, `TicketMarket`, `RoyaltyEngine`, `WhitelistManager`, `VoucherVerifier`, `TicketFactory`) — legacy, being retired
- Backend-signed gasless minting (`mintWithApproval` via `GASLESS_PRIVATE_KEY`) — to be replaced by Privy/Circle sponsorship at Arc Mainnet launch
- IPFS ticket images + metadata via Pinata
- MongoDB + Mongoose data layer
- QR-code ticket verification with HMAC signature
- **Paystack** fiat payments (Nigeria)
- Next.js 16 App Router, Tailwind CSS, Lucide icons, Sonner toasts

### 🆕 What We Built During This Hackathon (Arc path — this is the submission)

| Feature | What It Does | Where |
|---------|--------------|-------|
| **Flutterwave migration** | Full replacement of Paystack: initialize, verify, webhook signature validation, inline checkout, shared ticket email | `app/api/payments/flutterwave/{initialize,verify,webhook}/route.ts`, `lib/flutterwave/*` |
| **New `arc-contracts/` Hardhat project** | Standalone Hardhat workspace — contracts, deploy scripts, tests, deployment artifacts, README | `arc-contracts/` |
| **`CackPassArcPayment.sol` — deployed to Arc Testnet** | Records every ticket payment on-chain: `initializePayment`, `confirmPayment`, `failPayment`, `getPayment`, `getPaymentStatus`, `getUserPayments`. Emits `PaymentInitiated`, `PaymentConfirmed`, `PaymentFailed`. Contract **verified on ArcScan** | `arc-contracts/contracts/CackPassArcPayment.sol` |
| **Arc client library** | Server-side wrapper for the `CackPassArcPayment` contract — provider setup, signer, `generatePaymentId`, `paymentIdToBytes32`, `initializeOnChainPayment`, `confirmOnChainPayment`, `getOnChainPayment`, status decoding via `PaymentStatus` enum | `lib/arc/client.ts` |
| **Circle App Kit wrapper** | Client-side wrapper that drives the USDC transfer through Circle's SDK using the Privy embedded wallet's EIP-1193 provider; exposes `sendUSDCWithAppKit(provider, contractAddress, amount)` | `lib/arc/app-kit.ts` |
| **`ArcPaymentButton` component** | The UX layer: gets the Privy provider, calls `/api/payments/arc/initialize`, invokes `sendUSDCWithAppKit`, then redirects to `/payment/success?provider=arc&transaction_id=…`. Handles double-click protection, wallet-not-ready state, insufficient-funds messaging, and user-cancelled flows | `components/payments/ArcPaymentButton.tsx` |
| **On-chain payment audit trail** | Every ticket purchase writes to Arc: `paymentId`, payer, amount, platform fee, reference, `eventId`, `ticketQuantity`, status, timestamps — queryable via `getUserPayments(user)` | `arc-contracts/contracts/CackPassArcPayment.sol` |
| **Arc Testnet USDC payment flow** | Two-step verify: `initializePayment` (Pending) → Circle App Kit USDC transfer → `confirmPayment` (Confirmed). Full retry loop and idempotency | `app/api/payments/arc/{initialize,verify}/route.ts` |
| **Privy Fiat Onramp (Base Mainnet)** | Users buy real USDC with a card (NGN / USD / EUR / GBP); USDC delivered on **Base Mainnet** to the same embedded wallet | `app/dashboard/wallet/page.tsx` |
| **Dual-network wallet dashboard** | Arc (default) + Base (onramp) balances side-by-side; live polling; send; receive QR; transaction history from ArcScan API | `app/dashboard/wallet/page.tsx` |
| **Multi-source email resolution** | Verify routes resolve the buyer email from Order → Payment → `metadata.userEmail` → User, so tickets always reach the customer | `app/api/payments/arc/verify/route.ts`, `lib/email/ticket-confirmation.ts` |
| **Idempotent payment verification** | "Already processed" branch self-heals if tickets are missing; retries on-chain confirmation up to 5×; stores USDC tx hash in metadata as proof | `app/api/payments/arc/verify/route.ts` |
| **Guest checkout** | Email modal gate before payment — anyone can buy without logging in | `app/events/[id]/page.tsx` |
| **Multi-provider success page** | Handles `provider=flutterwave` and `provider=arc`, and formats amounts as NGN or USDC automatically | `app/payment/success/page.tsx` |

---

## ⛓️ The Arc Contract Suite — v1 Shipped, v2 Coming

### v1 — Shipped During This Hackathon (`arc-contracts/`)

We built a **dedicated Hardhat project** (`arc-contracts/`) containing the contract source, deployment scripts, comprehensive tests, and a full README. The first contract, **`CackPassArcPayment.sol`**, is deployed to Arc Testnet and **verified on ArcScan**.

**What `CackPassArcPayment` does:**

1. **`initializePayment(paymentId, amount, reference, eventId, ticketQuantity)`** — stores payer, amount, platform fee, status = `Pending`, timestamp, event ID, and ticket quantity on-chain.
2. **`confirmPayment(paymentId)`** (platform-owner-only) — flips status to `Confirmed`, emits `PaymentConfirmed`. Called by `/api/payments/arc/verify` after Circle App Kit reports the USDC transfer.
3. **`failPayment(paymentId, reason)`** (platform-owner-only) — marks a payment as failed.
4. **Public audit trail** — `getPayment`, `getPaymentStatus`, `getUserPayments`, `getUserPaymentCount`, `paymentExists`.
5. **Admin** — `updatePlatformFee` (capped at 10%), `transferOwnership`.
6. **Events** — `PaymentInitiated`, `PaymentConfirmed`, `PaymentFailed`, indexed by `paymentId` and `payer`.

**Deployed contract (Arc Testnet, verified):**

| Contract | Address | Explorer |
|----------|---------|----------|
| `CackPassArcPayment` | `0x084622e6970BBcBA510454C6145313c2993ED9E4` | [View on ArcScan](https://testnet.arcscan.app/address/0x084622e6970BBcBA510454C6145313c2993ED9E4#code) |

**Deployment details:**

| Field | Value |
|-------|-------|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| Platform Owner | `0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16` |
| Platform Fee | 200 bps (2%) |
| Deployment TX | `0xcf960ead7c4406d59c8ee3cf41e2e1295ef32a16f1fb8d162527eca570e0f202` |
| Block Number | 61151189 |
| Verified | ✅ Yes |

**Why it matters:** Even though the USDC transfer happens via Circle App Kit (off the contract), **every ticket sale has an on-chain receipt** — a permanent, tamper-proof record of who paid, how much, for which event, and how many tickets. This is what makes the Arc path a genuine Web3 payment rail, not just a crypto card swipe.

### v2 — Planned for Arc Mainnet Launch

At Arc Mainnet launch, we will deploy the **full CackPass contract suite** on Arc Mainnet as **v2**:

- `CackPassCore` — NFT ticketing logic
- `TicketMarket` — secondary market
- `RoyaltyEngine` — organizer royalties
- `WhitelistManager`, `VoucherVerifier`, `TicketFactory`
- `CackPassArcPayment` (mainnet version)

All legacy Lisk contracts will be retired once v2 is live.

---

## 🌐 Networks — Where CACK-pass Runs Today and Where It's Going

| Network | Role Now | Role at Launch | Chain ID | Gas Token | USDC |
|---------|----------|----------------|----------|-----------|------|
| **Arc Testnet** | **Default wallet + payment network** — native USDC ticket payments + on-chain payment records via `CackPassArcPayment` | **Primary production network** (Arc Mainnet, v2 contract suite) | 5042002 | **USDC** | `0x3600…0000` |
| **Base Mainnet** | **Privy Fiat Onramp** — where onramped USDC is delivered | Fiat onramp entry point | 8453 | ETH | `0x8335…2913` |
| **Lisk Mainnet** | Legacy — contracts being retired | **Deprecated (in a few weeks)** | — | ETH | — |

**Migration plan:**
1. **v1 (shipped):** `CackPassArcPayment` live on Arc Testnet, recording every payment on-chain.
2. **v2 (at Arc Mainnet launch):** Deploy the full CackPass suite (`CackPassCore`, `TicketMarket`, `RoyaltyEngine`, `WhitelistManager`, `VoucherVerifier`, `TicketFactory`, `CackPassArcPayment`) on Arc Mainnet.
3. Switch frontend default network + contract addresses to Arc Mainnet.
4. Replace the backend-signed gasless minting with **Privy-sponsored / Circle-sponsored transactions**.
5. Retire Lisk env vars, addresses, and RPC endpoints.

**Why Arc:** Native-USDC gas means users pay for tickets and gas in the same asset they already hold. Circle-native rails make USDC the first-class currency of the platform. Fast finality keeps event check-in snappy. And an on-chain payment record gives organizers and attendees a shared source of truth. CACK-pass intends to live on Arc — this hackathon is step one.

---

## ⛽ Gasless — Where We Are, Where We're Going

**Today (hackathon build):**
- Users never touch gas on Arc Testnet because **USDC is the native gas token**. Sending a ticket payment is one USDC transfer; gas is deducted from the same USDC balance.
- For the legacy Lisk path, gasless minting is backend-signed via `GASLESS_PRIVATE_KEY`.

**At Arc Mainnet launch (planned):**
- **Privy-sponsored transactions** for account-level user operations (login-created wallets, first-time ops).
- **Circle-sponsored transactions** for USDC-native flows on Arc, so end users continue to see zero gas.
- This removes the operational burden of a self-funded `GASLESS_PRIVATE_KEY` relayer, while preserving the same "no gas for the user" promise.

---

## 🛠️ Full Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router), React 19 |
| **Language** | TypeScript (strict) |
| **Auth & Wallets** | Privy.io — email / Google / Twitter login, embedded wallets |
| **Fiat Payments** | **Flutterwave v3** (card, USSD, bank transfer, mobile money) |
| **Crypto Payments** | **Circle App Kit** on **Arc Testnet** (native USDC, gas in USDC) |
| **On-chain Payment Records** | **`CackPassArcPayment.sol` — deployed & verified on Arc Testnet** |
| **Fiat → Crypto Onramp** | **Privy Fiat Onramp** — USDC delivered on **Base Mainnet** |
| **Smart Contracts** | Solidity — **Arc Testnet (v1)**: `CackPassArcPayment` via `arc-contracts/` Hardhat project; **Lisk (legacy)**: CackPass suite being retired |
| **Smart Contract Tooling** | Hardhat, Ethers.js v6, Chai, gas-reporter, coverage |
| **Gas Abstraction** | Arc native USDC gas today; **Privy / Circle sponsorship at Arc Mainnet launch** |
| **Database** | MongoDB + Mongoose |
| **Storage** | IPFS (Pinata) |
| **Styling** | Tailwind CSS v4 |
| **State / Data** | TanStack Query, React hooks |
| **UI** | Lucide React, Sonner, Radix UI primitives |
| **PWA** | next-pwa with Workbox |

---

## 💳 How Payments Work Now

### Flow A — Fiat (Flutterwave)

```
Buyer → Event page → "Card Payment"
      → Guest email modal (if not logged in)
      → POST /api/payments/flutterwave/initialize
      → Flutterwave inline checkout (card / USSD / bank)
      → Flutterwave callback with transaction_id
      → /payment/success?provider=flutterwave&transaction_id=…
      → /api/payments/flutterwave/verify
          ↳ confirm with Flutterwave API
          ↳ create Order + Payment + MyTicket records
          ↳ send ticket email with QR codes
```

### Flow B — Crypto (Arc USDC + on-chain receipt via `CackPassArcPayment`)

```
Buyer → Event page → "USDC"
      → ArcPaymentButton (uses Privy embedded wallet)          [components/payments/ArcPaymentButton.tsx]
      → POST /api/payments/arc/initialize
          ↳ CackPassArcPayment.initializePayment()              [lib/arc/client.ts]
             (on-chain Pending record)
          ↳ create Order + Payment
      → Circle App Kit: sendUSDCWithAppKit(provider, contract, amount)   [lib/arc/app-kit.ts]
          ↳ USDC transfer approved; gas paid in USDC on Arc
      → /payment/success?provider=arc&transaction_id=<usdc_tx_hash>
      → /api/payments/arc/verify
          ↳ CackPassArcPayment.confirmPayment()                 [lib/arc/client.ts]
             (on-chain Confirmed record)
          ↳ retry loop until status = confirmed
          ↳ create MyTicket records
          ↳ send ticket email via /api/email/ticket-confirmation
```

### Flow C — Fund Wallet with Fiat → USDC (Privy Onramp)

```
Buyer → Dashboard → Wallet → Receive → "Buy USDC"
      → useFiatOnramp().fund({ source: NGN/USD/EUR/GBP, destination: USDC on Base })
      → Provider completes purchase
      → USDC delivered to the same embedded wallet on Base Mainnet
      → Base balance appears in the wallet dashboard
```

---

## 📁 Key Files Added / Modified

### Core Arc integration (the heart of the hackathon)

```
lib/arc/
├── client.ts                            ← 🆕 SERVER-SIDE CONTRACT LIBRARY
│                                            • getArcProvider() — Arc Testnet RPC provider
│                                            • getArcContract() / getArcContractWithSigner() — read + write contract instances
│                                            • generatePaymentId() — unique bytes32 payment IDs
│                                            • paymentIdToBytes32() — encode IDs for the contract
│                                            • initializeOnChainPayment() — calls CackPassArcPayment.initializePayment
│                                            • confirmOnChainPayment() — calls CackPassArcPayment.confirmPayment
│                                            • getOnChainPayment() — reads payment struct + decodes PaymentStatus enum
│                                            • CackPassArcPaymentABI — full contract ABI
└── app-kit.ts                           ← 🆕 CLIENT-SIDE CIRCLE APP KIT WRAPPER
                                             • sendUSDCWithAppKit(provider, contractAddress, amount)
                                             • Uses the Privy embedded wallet's EIP-1193 provider
                                             • Drives the actual USDC transfer on Arc
                                             • Returns the tx hash for on-chain verification

components/payments/
└── ArcPaymentButton.tsx                 ← 🆕 THE UX LAYER THAT TIES IT ALL TOGETHER
                                             • Gets Privy embedded wallet + EIP-1193 provider
                                             • Calls POST /api/payments/arc/initialize
                                             • Invokes sendUSDCWithAppKit() from lib/arc/app-kit.ts
                                             • Redirects to /payment/success?provider=arc&transaction_id=…
                                             • Guards: double-click protection, wallet-not-ready, insufficient funds,
                                               user-cancelled (ACTION_REJECTED), login-required
                                             • Powers the "USDC" tab on every paid event page
```

### API routes

```
app/api/payments/arc/
├── initialize/route.ts                  ← 🆕 calls lib/arc/client.ts initializeOnChainPayment()
│                                            creates Order + Payment with the on-chain paymentId
└── verify/route.ts                      ← 🆕 calls lib/arc/client.ts getOnChainPayment() + confirmOnChainPayment()
                                             retries until Confirmed; creates MyTicket records; sends email
```

### Fiat migration (Paystack → Flutterwave)

```
app/api/payments/flutterwave/
├── initialize/route.ts                  ← 🆕 fiat payment init
├── verify/route.ts                      ← 🆕 fiat payment verify
└── webhook/route.ts                     ← 🆕 Flutterwave webhook (verif-hash signature)

lib/flutterwave/                          ← 🆕 client + service for Flutterwave v3
```

### Pages

```
app/
├── dashboard/wallet/page.tsx            ← 🔁 redesigned: Arc + Base dual view (uses useFiatOnramp)
├── events/[id]/page.tsx                 ← 🔁 guest email gate + dual rails (mounts <ArcPaymentButton />)
├── payment/success/page.tsx             ← 🔁 handles provider=flutterwave and provider=arc
└── api/email/ticket-confirmation/route.ts ← shared ticket email used by both rails

components/auth/WalletButton.tsx         ← 🔁 profile gate
```

### Arc contract project (Hardhat workspace)

```
arc-contracts/                            ← 🆕 ENTIRE NEW HARDHAT PROJECT
├── contracts/
│   └── CackPassArcPayment.sol           ← 🆕 on-chain payment proof + audit trail
├── scripts/
│   ├── deploy.ts                        ← 🆕 deployment script (deploys + verifies on ArcScan)
│   └── interact.js                      ← 🆕 CLI helper: init-payment, confirm, get-payment, get-user-payments
├── test/
│   └── CackPassArcPayment.test.js       ← 🆕 comprehensive test suite
├── deployments/                          ← 🆕 deployment artifacts (arc-*.json + ABI)
├── hardhat.config.js                    ← 🆕 Hardhat configuration for Arc Testnet
├── package.json                          ← 🆕 project deps
└── README.md                            ← 🆕 arc-contracts README
```

**The three files that make the Arc path work end-to-end:**

1. **`lib/arc/client.ts`** — the **server-side contract library**. Speaks to `CackPassArcPayment` on Arc Testnet (initialize, confirm, read). Runs on the backend so it can safely use the platform owner's private key for `confirmPayment`.
2. **`lib/arc/app-kit.ts`** — the **client-side Circle App Kit wrapper**. `sendUSDCWithAppKit()` uses the user's Privy embedded wallet provider to actually move USDC on Arc. This is where the native-USDC transfer happens.
3. **`components/payments/ArcPaymentButton.tsx`** — the **UX orchestrator**. Ties the backend route, the Circle App Kit transfer, the Privy wallet, and the redirect to `/payment/success` into one button users click.

Without all three, the Arc payment rail doesn't exist. They are the core code of this submission.

---

## 🧪 Try the Demo

**Live:** https://cackpass-ethonline.vercel.app/
**Video:** https://youtu.be/ZiU2gWjEjvU

### Test the Flutterwave fiat flow
1. Open any paid event → click **Card Payment** → enter guest email
2. Use Flutterwave test card: `5531 8866 5214 2950`, CVV `564`, expiry `09/32`, PIN `3310`, OTP `12345`
3. Ticket + QR code arrive in the email

### Test the Arc USDC flow
1. Fund the Privy embedded wallet on Arc via the [Circle Faucet](https://faucet.circle.com)
2. Open a paid event → **USDC** tab → **Pay X USDC**
3. Approve in Circle App Kit → auto-redirect → on-chain confirmation → ticket email
4. Verify on **ArcScan**: every purchase writes `PaymentInitiated` + `PaymentConfirmed` to `CackPassArcPayment`

### Test the Privy Fiat Onramp
1. Go to `/dashboard/wallet` → **Receive** tab → **Buy USDC**
2. Complete the Privy onramp in NGN / USD / EUR
3. USDC appears in the **Base Mainnet** balance card on the same page

---

## 🔒 Smart Contracts

### Arc Testnet (v1 shipped during this hackathon — the forward path)

| Contract | Purpose | Address |
|----------|---------|---------|
| `CackPassArcPayment` | On-chain payment proof + audit trail: `initializePayment` / `confirmPayment` / `failPayment` / `getPayment` / `getPaymentStatus` / `getUserPayments` / `getUserPaymentCount` / `paymentExists` / `updatePlatformFee` / `transferOwnership` | `0x084622e6970BBcBA510454C6145313c2993ED9E4` — [verified on ArcScan](https://testnet.arcscan.app/address/0x084622e6970BBcBA510454C6145313c2993ED9E4#code) |

**Events emitted:** `PaymentInitiated`, `PaymentConfirmed`, `PaymentFailed` — indexed by `paymentId` and `payer` for off-chain indexing.

**Project location:** `arc-contracts/` — includes Hardhat config, deploy scripts, tests, deployment JSON, ABI, and README.

**Frontend integration:** `lib/arc/client.ts` (server), `lib/arc/app-kit.ts` (client USDC transfer), `components/payments/ArcPaymentButton.tsx` (UX).

### Lisk (legacy — being retired)

> **Lisk Mainnet is scheduled to be deprecated in a few weeks.** These addresses are historical context only; the production CackPass suite will be replaced by the Arc v2 deployment at Arc Mainnet launch.

| Contract | Address |
|----------|---------|
| WhitelistManager | `0xA2Aea35523a71EFf81283E32F52151F12D5CBB7F` |
| VoucherVerifier | `0xFB69D0fb9C892F3565D66bcA92360Ca19B8D9780` |
| CackPassCore | `0xcc68Ce1342B91cC9A1F97e8863c77465910f2e63` |
| RoyaltyEngine | `0x589C1494089889C077d7AbBA17B40575E961cC8c` |
| TicketMarket | `0x7b954082151F7a44B2E42Ef9225393ea4f16c482` |
| TicketFactory | `0x49e7127A28c153CC69e196344799E873303a8424` |

### Arc Mainnet (v2 planned at launch)

Full CackPass suite: `CackPassCore`, `TicketMarket`, `RoyaltyEngine`, `WhitelistManager`, `VoucherVerifier`, `TicketFactory`, plus a mainnet version of `CackPassArcPayment`.

---

## 🚧 Known Limitations & Roadmap

- **Lisk → Arc Mainnet migration** — v1 (`CackPassArcPayment`) shipped; v2 (full suite) at Arc Mainnet launch. Lisk Mainnet deprecating in a few weeks.
- **Selfie Check / World ID anti-scalping gate** — designed (per-event gate on paid tickets) but not shipped: Selfie Check (Beta) sandbox access is gated by a World point-of-contact. Integration plan documented separately.
- **Arc ↔ Base bridge** — Base USDC (from onramp) and Arc USDC (for ticket payment) are separate balances today. A bridge (Circle CCTP or Axelar) would let users move onramped USDC to Arc without leaving the app.
- **Webhook replay protection** — Flutterwave webhook validates `verif-hash` but does not yet deduplicate by event ID.
- **Gasless at Arc Mainnet** — will use **Privy-sponsored and Circle-sponsored transactions** so users never need a separate gas token.

---

## 🙏 Credits

- **Circle App Kit** — USDC transfer SDK on Arc (wrapped in `lib/arc/app-kit.ts`)
- **Privy** — embedded wallets + Fiat Onramp
- **Flutterwave** — fiat card / USSD / bank rails in Africa
- **World.org** — Selfie Check design (integration scoped, not shipped)
- **Arc** — the network CACK-pass is migrating to

---

## 📄 License

MIT © 2026 CACK-pass Team

**Built for Event Creators. Zero gas. Maximum memories.**

---

### For Judges — Quick Navigation

| Want to see | Go to |
|-------------|-------|
| Live app | https://cackpass-ethonline.vercel.app/ |
| Video walkthrough | https://youtu.be/ZiU2gWjEjvU |
| **Server-side Arc contract library** | `lib/arc/client.ts` |
| **Client-side Circle App Kit wrapper** | `lib/arc/app-kit.ts` |
| **The USDC payment button component** | `components/payments/ArcPaymentButton.tsx` |
| Arc contract project | `arc-contracts/` |
| Arc contract on ArcScan | [0x084622…D9E4](https://testnet.arcscan.app/address/0x084622e6970BBcBA510454C6145313c2993ED9E4#code) |
| Fiat payment flow | `/events/[id]` → **Card Payment** |
| Crypto payment flow | `/events/[id]` → **USDC** |
| Onramp (Base) + dual-network wallet | `/dashboard/wallet` |
| Payment success (multi-provider) | `/payment/success?provider=arc` or `?provider=flutterwave` |
| Payment APIs | `app/api/payments/{arc,flutterwave}/*` |

**Continuity in one line:** *CACK-pass is migrating off Lisk to Arc — with a purpose-built `arc-contracts/` Hardhat project and a deployed, verified `CackPassArcPayment` contract already recording every ticket payment on-chain — powered by a three-file Arc core (`lib/arc/client.ts`, `lib/arc/app-kit.ts`, `components/payments/ArcPaymentButton.tsx`) — while Flutterwave keeps fiat buyers in, and the full suite follows on Arc Mainnet at launch.*