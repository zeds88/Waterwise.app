# Waterline Residential Membership — two-sided piece (brand v3)

Front: membership flyer. Back: membership agreement with acceptance block.
Letter, portrait, print-ready. Built to the Waterline brand v3 spec
("Every drop, by design."): official green drop lockup, navy/sky/steel palette,
serif display type, ice cards, mist callouts, spec footer microcopy.

## Files

| File | What it is |
|---|---|
| `waterline-membership.pdf` | Print-ready two-page PDF |
| `waterline-membership.html` | Self-contained HTML (logo + QR inlined) |
| `page-1.png`, `page-2.png` | 2x previews |
| `waterline_logo.png` | Official lockup (copied from the estimating skill) |
| `src/membership.src.html` | Editable source (tokens: `__LOGO__`, `__QR__`, `__CHK__`, `__TCK__`) |
| `src/build.mjs` | Inlines assets, renders PDF + PNGs, checks for page overflow |

## Rebuild

```bash
cd waterline/membership/src
npm i playwright qrcode            # once
CHROME_PATH=/path/to/chrome node build.mjs   # CHROME_PATH optional if Playwright's browser is installed
```

The script prints an overflow report per page; `overflowing: 0` on both is required.

## Offer as built (decisions to confirm)

| | Essential | Recommended | Premium |
|---|---|---|---|
| Price | $299 / yr | $499 / yr | $799 / yr |
| Seasonal visits | 2 (spring, fall) | 4 (+ summer, freeze prep) | 4 |
| Service-call fee | $0 | $0 | $0 |
| Repair discount | 10% | 10% | 10% |
| Hydrawise monitoring | — | ✓ | ✓ |
| Annual drain flush | — | ✓ | ✓ |
| Response | Priority | Priority | Next business day |
| Repair credit | — | — | $150 / yr |
| Workmanship warranty | 1 yr | 1 yr | 2 yr |
| Transfers on sale | — | — | ✓ |

Why it changed from the original mockup:

- Four visits at $299 sold visits below the $85 service-call rate. Essential now carries two.
- Tiers differ by inclusions, not discount depth. One 10% rate keeps the "drop scope, not rate" rule and protects the 60% margin target.
- Premium has real deliverables instead of an extra 5% off.
- Names match the estimate format customers already see (Essential / Recommended / Premium).

## Items to verify before printing

- Phone number (214) 606-4211 is carried over from the original mockup; it is not in any Waterline source file.
- The TCEQ statement in term 14 should be checked against the current 30 TAC Chapter 344 wording.
- QR code points to https://waterlinedfw.com. Change the URL in `build.mjs` if a booking link is preferred.
