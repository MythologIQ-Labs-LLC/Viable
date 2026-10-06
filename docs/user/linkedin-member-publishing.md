# LinkedIn Member Publishing (Slice D proof)

## Status

This guide describes the first connected-publishing proof (#107). It publishes public, text-only posts to **your own LinkedIn member profile** from approved publication inventory, using the deterministic scheduler.

It is a developer-owned, self-service setup. It does not use LinkedIn Community Management, organization pages, hosted Viable OAuth, analytics, or background publishing.

## What you need

- the Viable desktop app with the operating-system credential vault available;
- a LinkedIn developer application you control, with these self-service products enabled:
  - **Sign in with LinkedIn using OpenID Connect** (`openid`, `profile`);
  - **Share on LinkedIn** (`w_member_social`);
- in Calendar, an active LinkedIn destination whose ownership you have confirmed;
- a publication policy for that destination and at least one item of approved, stocked publication inventory.

## Connect LinkedIn

Open **Calendar**. The **LinkedIn member** panel appears in the Publication inventory area.

1. Use **Open LinkedIn Developer Apps in your browser** to confirm both products are enabled on your app. The link opens in your system browser, never inside Viable.
2. Use **Open LinkedIn Token Generator in your browser**. Select your app and request `openid`, `profile`, and `w_member_social`. Sign in and consent yourself; Viable never automates LinkedIn login, MFA, or consent.
3. Copy the access token once. Optionally note its expiration.
4. In Viable, choose the LinkedIn destination, paste the token, optionally enter the expiration, and select **Validate and connect LinkedIn**.

What happens next:

- the token field is cleared before validation starts;
- the native layer calls LinkedIn's OpenID Connect `userinfo` endpoint and uses the returned `sub` as your Person URN (`urn:li:person:<sub>`);
- only after successful validation is the token written to the operating-system credential vault;
- Viable workspace storage keeps only non-secret metadata: the opaque credential reference, member URN, required scopes, status, and optional expiry.

If validation fails, an existing working connection and its stored token are left unchanged. If native validation succeeds but the local connection record cannot be saved, Viable makes a best-effort attempt to remove the newly stored vault credential instead of leaving an unreferenced token behind.

## Disconnect LinkedIn

Use **Disconnect** on the connected LinkedIn destination before deleting or replacing its Viable workspace.

Disconnect is ordered deliberately:

1. remove the access token from the operating-system credential vault;
2. only after that succeeds, remove the local non-secret connection record.

If vault removal fails, the local connection record remains so Viable does not falsely claim the account has been disconnected. If the local record removal fails after the token is gone, the remaining record points to a missing credential and connected publishing fails closed until the connection is repaired or disconnected again.

Provider connection metadata is machine-local capability state. It is **not** included in portable workspace backups or recovery points, and restoring a workspace never recreates LinkedIn account authority.

## Run the live proof

Select **Run automation now**. Viable runs one deterministic scheduler evaluation against approved stock:

- due work executes first, otherwise the next eligible stock is scheduled and, if its slot is now, executed;
- the exact approved text is sent; nothing is rewritten at execution time;
- Viable does **not** keep publishing in the background while closed.

The control refuses to run while non-LinkedIn automated stock or pending automated jobs exist, so nothing can be routed through the wrong provider. Manual activation remains available for every channel.

## Outcomes

| LinkedIn result | Viable record |
| --- | --- |
| `201 Created` with `X-RestLi-Id` | Published, with the provider post ID as evidence |
| `201` without `X-RestLi-Id`, `5xx`, redirect, timeout, or connection lost after sending | Outcome unknown. Never retried automatically; check your profile and reconcile manually |
| Could not connect (offline, DNS, TLS) before sending | Retry later within the policy's bounded retry limit |
| `429` | Retry later within the policy's bounded retry limit |
| `401` / `403` | Job failed; connection becomes **Reconnect required**; no further dispatch until you reconnect |
| Other `4xx` | Provider rejected; job failed |

Cancelling a failed job returns its reserved, still-valid stock to inventory.

## Data safety

Tokens never appear in workspace data, publication inventory, exports, backups, logs, or browser storage. The native LinkedIn client never follows redirects with your authorization.

## Known limitations

- text-only member posts; no images, video, articles, or organization pages;
- tokens from the Token Generator expire and must be regenerated and reconnected;
- no background scheduling; publishing happens only when you select **Run automation now**;
- LinkedIn is the only connected provider in this slice.

## Related documentation

- [Calendar, Manual Activation, Outcomes, and Learning](calendar-activation-and-learning.md)
- [Automated publishing implementation decisions](../decisions/automated-publishing-implementation-decisions.md)
- [ADR-0009](../adr/0009-deterministic-publishing-and-capability-routed-setup.md)
