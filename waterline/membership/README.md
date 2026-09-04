# Waterline membership pieces (brand v3)

Two two-sided Letter pieces, print-ready. Front is the plan flyer, back is the agreement
with an acceptance block. Built to the Waterline brand v3 spec ("Every drop, by design."):
official green drop lockup, navy/sky/steel palette, serif display type, ice cards, mist
callouts, spec footer microcopy.

| Edition | Audience | Files |
|---|---|---|
| Residential | Homeowners | `waterline-membership-residential.{pdf,html}`, `residential-page-{1,2}.png` |
| Commercial | Property managers, HOAs, retail, office, multifamily | `waterline-membership-commercial.{pdf,html}`, `commercial-page-{1,2}.png` |

Source lives in `src/`: `brand.css` (shared), `residential.src.html`, `commercial.src.html`,
and `build.mjs`. Assets in `assets/`: official logo, commercial hero photo.

## Rebuild

```bash
cd waterline/membership/src
npm i playwright qrcode                       # once, anywhere on NODE_PATH
CHROME_PATH=/path/to/chrome node build.mjs    # CHROME_PATH optional if Playwright's browser is installed
```

The script inlines CSS, logo, photo, and QR, renders PDFs and 2x PNGs, and exits non-zero
if any content on any page reaches the footer.

## Residential plans (monthly first, cancel anytime)

| | Essential | Recommended | Premium |
|---|---|---|---|
| Monthly | $29 | $49 | $79 |
| Annual (saves) | $299 ($49) | $499 ($89) | $799 ($149) |
| Seasonal visits | 2 (spring, fall) | 4 (+ summer, freeze prep) | 4 |
| Service-call fee | $0 | $0 | $0 |
| Repair discount | 10% | 10% | 10% |
| Hydrawise monitoring | — | ✓ | ✓ |
| Annual drain flush | — | ✓ | ✓ |
| Response | Priority | Priority | Next business day |
| Repair credit | — | — | $150 / yr |
| Workmanship warranty | 1 yr | 1 yr | 2 yr |
| Transfers on sale | — | — | ✓ |

Cancel-anytime mechanics (agreement term 12): monthly billing stops at month end; if a
membership ends before month 12, benefits already used are trued up at standalone value
(visits $85, drain flush $150, repair credit as used) less amounts paid, capped at the
balance of the year. That keeps a spring tune-up from being bought for one $29 payment.

## Commercial plans (per property, up to 12 zones, +$12/zone/mo above)

| | Core | Managed | Full Service |
|---|---|---|---|
| Monthly | $199 | $349 | $549 |
| Annual (saves) | $1,990 ($398) | $3,490 ($698) | $5,490 ($1,098) |
| Site walks | 12 | 12 + 8 peak wet checks | 12 + 8 |
| Service-call fee | $0 | $0 | $0 |
| Repair discount | 10% | 10% | 10% |
| Controller monitoring | — | ✓ | ✓ |
| Drain / catch basin cleaning | — | Quarterly | Quarterly |
| Response | 48 h | 24 h | Same business day |
| Minor parts included | — | — | Up to $75 / visit |
| Pre-approved repairs | — | — | Up to $250 / visit |
| Water-use reporting | — | Quarterly | Annual audit + quarterly |
| Workmanship warranty | 1 yr | 1 yr | 2 yr |

Month to month with 30-day notice, invoiced on the 1st, net 15, Zelle / ACH / check.
Core pricing works out to roughly $130 per hour of site time including travel at one
walk a month, which clears the $105 labor rate; Managed and Full Service scale from there.

## Items to verify before printing

- Phone: (818) 869-2142 on both editions, per Danny.
- The commercial hero photo (`assets/hero-commercial.jpg`) is 612 px wide. It prints fine at
  the 2.9 in hero width, but replace it with a full-resolution or licensed image before a
  print run.
- The TCEQ statement (term 14 in both agreements) should be checked against current
  30 TAC Chapter 344 wording.
- Backflow testing in the commercial edition is "coordinated with a licensed backflow
  prevention assembly tester"; adjust if Danny holds a BPAT license himself.
- QR codes point to https://waterlinedfw.com. Change the URL in `build.mjs` for a booking link.
