# Testing the course

No card is charged.

1. Open `/checkout/?item=course` and confirm TEST MODE.
2. Simulate a test purchase with your email.
3. Open `/learn/`. The page should offer the magic link on screen. Open it.
4. Mark a lesson complete and submit its quiz.
5. Open `/learn/admin.html`. The row shows the email, tier `course`, a progress percent above 0, and a last-active time.
6. Download the CSV and confirm the same email and percent.
7. Open `/learn/certificate.html` only after every lesson is complete. Before that, it should say the course is not finished.
8. `cd automation && npm test` covers the same purchase, link, quiz, and CSV without a browser.

A Worker test of the Stripe sample payload is in `automation/test/automation.test.js`. It expects tier `course` and `testMode: true`.

Switching the classroom to live is the same switch as payments: `STRIPE_MODE=live` and `payments-config.json` `mode` of `live` together. Test students stay flagged `testMode` and should not be treated as paying students.
