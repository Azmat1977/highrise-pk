# WP10 Direct API Abuse & Privacy

Use disposable staging/local accounts and Property IDs.

Required attack families:
- cross-owner PATCH/trash/purge;
- buyer → admin moderation calls;
- cross-agent/developer Lead access;
- draft/flagged/trashed direct-ID reads;
- client Lead-recipient override fields;
- owner mass-assignment of verification/flag/deletion/ownership fields;
- private evidence ID/URL guessing;
- public contact PII scraping from HTML/Next data/API;
- contact/inquiry/report abuse limits;
- retired route mutation attempts;
- error-path stack/secret leakage.

A security PASS requires both access denial **and** proof that DB/media/audit state did not mutate unexpectedly.
