# Security policy

Thank you for helping keep TimTim.Live and the people who use it safe.

## Report a vulnerability privately

**Please do not open a public issue, discussion or pull request for a security problem.**

Use GitHub private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability**.
3. Tell us what you found, how to reproduce it, and what could happen.

TimTim.Live's security policy, including what is in scope: https://timtim.live/partners/security

## What to include

- The repository, file and version (or commit) affected.
- Steps to reproduce, ideally with a minimal example.
- What an attacker could do with it.
- Any API `request_id` (from the `TimTim-Request-Id` header) that shows it.

Please **never send real keys**, real customer data or other people's information. Use a sandbox key (`tt_test_…`) and sample events to show the problem.

## What happens next

We will confirm we received your report, look into it, and keep you updated through the private advisory until it is fixed. We credit reporters who want credit when the fix is published.

## Supported versions

These projects are a **Developer Preview** (version 0.x). Security fixes go into the newest release only.

## Keys you find in the wild

If you find a TimTim.Live key (`tt_sk_live_…`, `tt_pk_live_…`, `tt_test_…`) somewhere public, report it the same way. Do not use it.
