# Core / Ignition — fail-closed server audit

**Date:** 2026-07-19  
**Scope:** STARTER shops must not invoke Pro hot paths even if UI is bypassed.

| Hot path | Gate | Result on Core |
|----------|------|----------------|
| MOTOR labor cache / Labor Book MOTOR init | `motorEnabledForShop` → `canUseReleasedFeature(..., "motorLabor")` | Denied / reference-only |
| Share via SMS (estimate / invoice / DVI) | `releasedFeatureDenied(..., "sms")` + `SMS_ENABLED` | Error; email still works |
| `sendShopSms` / messaging actions | `releasedFeatureDenied(..., "sms")` | Denied |
| PartsTech / vendor test connection | `releasedFeatureDenied(..., "parts")` | Denied |
| Stripe Connect onboarding | `canUseFeature(..., "stripePayments")` | Denied |
| Invoice Checkout (staff + public token) | `getCheckoutStripeContext` + staff action gate | Manual Record only |
| Deposit SMS | `releasedFeatureDenied(..., "sms")` | Denied |
| Freeform / Smart RO intake | `releasedFeatureDenied(..., "freeform_ro_intake")` + AI Plus | Denied without add-on |
| Growth routes `/marketing/**` | `checkCrmRouteAccess` + `marketing_campaigns` release | Redirect denied |
| Messages inbox `/messages` | Plan route gate `sms` | Redirect denied |
| Payments hub `/payments*` | Plan route gate `stripePayments` | Redirect denied |
| Labor Book `/quick-labor` | Plan route gate `motorLabor` | Redirect denied |

**Nav/chrome:** `isPlanHiddenNavHref` + capabilities from `(app)/layout.tsx` hide Growth, Messages, Payments, Labor Book when flags are false.

**Verify:** enter Macuto (`shop_macuto`) and confirm deep links above soft-land on Subscription or dashboard denied banner — not Pro UI.
