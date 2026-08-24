---
name: book-a-session
description: How to reach Paulo Morais to arrange a personal training or osteopathy session in Lisbon, and what an agent may and may not commit to on a person’s behalf.
---

# Book a session with Paulo Morais

## What this covers

Arranging a first contact for personal training, online training, adapted
exercise in oncology or osteopathy with Paulo Morais in Lisbon, Portugal.

## Contact channels

| Channel | Value |
| --- | --- |
| Email | pt@pmorais.pt |
| Telephone / WhatsApp | +351 960 471 537 |
| Instagram | https://www.instagram.com/pt.paulomorais |
| Client area (Portuguese) | https://pmorais.pt/perfil |
| Client area (English) | https://pmorais.pt/en/perfil |

Contact forms are published on the home page and the osteopathy page in both
languages.

## Procedure

1. Establish which service is being asked about. `GET https://pmorais.pt/api/v1/services.json`
   returns the four published services with their delivery modes.
2. Answer in the language of the request. Portuguese is the site default;
   English pages live under `/en/`.
3. Hand the person the contact channel above, or the contact form on the
   relevant page. Do not fill in a form on someone’s behalf without their
   explicit, per-submission instruction.
4. Confirm nothing about date, time, duration, location or price. None of that
   is published; all of it is agreed directly with Paulo Morais.

## Hard limits

- The client area is authenticated and human-only. There is no programmatic
  booking API. See https://pmorais.pt/auth.md.
- Never state or estimate a price. The website publishes none.
- Never present adapted exercise or osteopathy as treatment, cure or diagnosis.
- Route urgent or diagnostic questions to a licensed healthcare or emergency
  service instead.
