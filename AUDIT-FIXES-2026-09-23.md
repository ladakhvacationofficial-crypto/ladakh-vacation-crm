# Ladakh Vacation remediation status

This report follows the module audit dated 23 September 2026. It describes verified code changes, not a claim that every module is complete or deployed.

## Completed changes

| Area | Result |
|---|---|
| Email, social, nurturing and ad conversions | Missing providers and rejected requests no longer count as successful delivery. Google conversion upload uses the existing OAuth transport and checks provider acceptance. |
| Reporting | Removed invented historical counts and forecasts. Planning views use recorded data and state their assumptions. API failures are shown instead of silently becoming zero balances. |
| Access control | Invoice, individual scoring, booking search and attachment access enforce the underlying record's ownership. Social account responses exclude tokens. |
| Documents | New operational uploads are encrypted before object storage. Authenticated API downloads enforce entity access. File limits and real object deletion added. Booking and employee screens expose document controls. Public media remains separate. |
| Campaigns | Preview and send share audience selection, opt-outs and frequency caps. Atomic claims prevent duplicate starts; cancellation is checked between recipients and failures remain visible. |
| Leads | Normalized phone key is stored, indexed and used for capture/import matching. |
| Bookings and finance | Booking creation, edits, cancellation, receipts/refunds and supplier-cost changes use transactions. Financial mutations serialize on the booking row. Invoice numbering retries collisions. |
| Itineraries | Rate assignment rejects inactive suppliers/rates and rates outside the selected date. |
| Meta webhook | Verify token and raw-body signature are required. Missing secrets fail closed. |
| Site and CRM | Ladakh identifiers and copy cleanup; actual SEO page count; corrected production start command and wake-ping switch; public website visit attribution; protected documents UI. |
| Combined deployment | Preserved seven newer GitHub commits that combine the site and CRM in one Vercel project. Website is `/`, staff login is `/login`; no CRM subdomain is required. Build sync now refreshes CRM components instead of retaining stale copies. Staff responses use noindex and staff pages do not send public visit beacons. |
| GoDaddy | Local lander API points to the backend discovered in the newer GitHub configuration. All generated pages rebuilt. These files still require GoDaddy upload. |

## Evidence

- Backend: 37 suites, 281 tests passed, including new ownership, encryption, campaign, transaction, webhook and truthful-reporting regressions.
- Backend, standalone CRM and website production builds passed before merging the newer unified project.
- The merged combined application also built successfully, generating 76 static pages plus dynamic routes. Local HTTP checks returned 200 for /, /login, /reports and /follow-ups. Staff routes returned noindex, nofollow.
- Neon `ladakh_crm`: two additive migrations applied. All four migrations are recorded as applied. No reset was performed. The invoice default matches the existing application fallback; issued invoices are unchanged.
- Read-only counts: zero attachment records and zero leads in this database. No recorded legacy attachments need conversion. This does not inventory orphaned objects in storage.
- `https://ladakhvacationecosystem.onrender.com/api/health` returned the expected Ladakh backend service response, and `/api/health/db` returned database up. These checks do not prove which database its environment selects or that the new code has deployed.
- Both Next.js apps were updated to 16.3.6. The combined app build passed on that version; npm audit reports zero vulnerabilities in both frontend dependency trees. The standalone CRM transitive nanoid patch is also installed.

## Remaining work and limits

- Deployment of these commits, real owner login, full browser acceptance and recipient/provider delivery still require verification. Connected hosting accounts do not expose the Ladakh projects.
- Set the combined Vercel project's Root Directory to `web`, with both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_LEAD_CAPTURE_URL`. Redeploy after changing public variables.
- Render needs the intended Neon connection, stable `INTEGRATION_KEY` (or dedicated `STORAGE_ENCRYPTION_KEY`), correct `CRM_BASE_URL`, and `APP_URL` for unsubscribe links. Keep encryption keys backed up and unchanged until encrypted data is migrated.
- Campaign scheduling still uses the backend process, not a durable worker. Restarted campaigns are marked failed for operator review; provider timeouts can require manual reconciliation. Social publishing interrupted after a provider accepts a post also requires reconciliation before retrying.
- Dedicated traveller roster, permit lifecycle and altitude/season route validation remain unimplemented. A protected attachment panel is not a complete traveller/permit workflow.
- B2B white-label quote generation, mobile app, inventory allotments, bank disbursements and automatic website/CRM content synchronization are not implemented.
- Standalone invoice paid status remains separate from booking payment accounting.
- Existing integration credentials, business identity, pricing/tax settings and marketing claims need operational acceptance. No real marketing messages were sent by these tests.
- No backup restore, live sensitive-document round trip, or complete role-by-role browser test has been performed.

Dependency references: [Windows advisory](https://github.com/advisories/GHSA-p293-qw3h-jr36), [image optimization advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4).
