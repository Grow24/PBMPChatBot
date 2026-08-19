# Meta Developer vs WAPI — when PBMP needs its own app

You do **not** need a Meta Developer account just to use WhatsApp Business or because WAPI already provides messaging.

## Decision table

| What you want | Your Meta Developer account? | Why |
|---------------|------------------------------|-----|
| Continue existing WAPI messaging | No | WAPI already is the Meta/API layer |
| WAPI inbox, basic messaging, templates | No | WAPI’s Meta integration |
| WhatsApp Business App (manual) | No | Separate from developer setup |
| Manage WABA in WhatsApp Manager | No | Business admin, not app development |
| Create a simple Flow in WhatsApp Manager | Generally no | Managed in WhatsApp Manager |
| Have WAPI send a Flow that WAPI supports | No (potentially) | WAPI can use its own Meta app |
| PBMP send via Cloud API directly | **Yes** | Needs Meta App + credentials |
| PBMP receive Meta webhooks directly | **Yes** | Webhook belongs to a Meta App |
| PBMP call Flows API directly | **Yes** | Needs your Meta App |
| Dynamic Flow → PBMP endpoint under your control | **Yes** (for direct Meta) | PBMP is part of the API architecture |
| PBMP handle WhatsApp Calling directly | **Yes** | Calling needs your Meta App |
| Keep WAPI messaging, PBMP handles calls | **Yes** | Separate Meta App for the calling path |
| PBMP onboard other companies’ WABAs | Definitely yes | Embedded Signup / Tech Provider |
| Eventually replace WAPI | Definitely yes | PBMP becomes the WhatsApp tech layer |

Cloud API getting-started starts with registering as a Meta developer and creating a Meta App.

## Architecture

**Today (do not break this):**

```
WhatsApp → WAPI → PBMP
```

**Next (after Developer registration):**

```
                 Meta / WABA
                     │
          ┌──────────┴──────────┐
          │                     │
       Messages               Calls / Flows experiments
          │                     │
        WAPI              PBMP-owned Meta App
          │                     │
        PBMP              PBMP experiments (voice / Flows API)
```

**Eventually (optional):**

```
Meta / WhatsApp → PBMP Meta App → PBMP WhatsApp Gateway
  → Messages + Calls + Flows + Webhooks → PBMP
```

## Device-trust block (not a Developer rejection)

Error like:

> You can't make this change at the moment… we noticed you are using a device you don't usually use…

This is Facebook **device/session trust**, not “you are not allowed to be a developer.”

Same laptop ≠ same device. Chrome profile A vs B vs Firefox vs Incognito look different. VPN / cleared cookies also reset trust.

### Before support

On the machine Facebook already trusts:

1. Use the **exact** browser profile of the longstanding session (e.g. Chrome `grow24.ai.collaboration`). Not Firefox, Incognito, Guest, another Chrome profile, VPN, or a wiped browser.
2. Open **facebook.com**, confirm **Sandeep Seth**, browse normally. Then another tab → Meta for Developers → register.
3. Accounts Centre → Password and security → **Where you're logged in** — this browser should appear.
4. Do **not** hammer the register button.
5. Do **not** log out of the good session.

There is no published wait time for this hold.

### Support (if block remains)

Use **Business Support Home** (you already have a Business Portfolio). Keep the ticket **only** about Developer registration / device trust — not WAPI, number bans, Flows, or Calling.

- Profile: Sandeep Seth  
- Portfolio: Sandeep Seth  
- Business ID: `25448840868068257`  
- OTP email works; block is after verification  
- Paste the exact error + screenshot  

## Immediate sequence

1. Do **not** change WAPI.  
2. Keep the working Facebook session open.  
3. Retry Developer registration from the **recognised Chrome profile**.  
4. If still blocked → stop retries → Business Support Home.  
5. After registration succeeds → create a **PBMP-owned Meta App**.  
6. Use that app **only for experiments** (Flows API / Calling) — do not retarget WAPI’s messaging webhooks or tokens.

**Next:** [META_CALLING_AND_CATALOGUE.md](./META_CALLING_AND_CATALOGUE.md) for Calling webhook + catalogue scaffold.  
**Android voice POC:** [AUTOMATE_POC.md](./AUTOMATE_POC.md).
