# Kassa design review

2026-10-27. Scope: restyle the existing cashier and admin screens.

Preserved: blue palette, neutral dark theme, transparency, smiley, two-column menu, routes, ids, content and all action handlers. No new imagery, claims or product data.

Changed: consistent spacing, aligned menu grid, restrained shadows, clearer selected checks, keyboard focus, shared color and font tokens, responsive admin action labels and input borders. Theme icons now use SVG; theme labels retain their wording. Import section labels moved below headings without removing their text.

Baseline Hallmark scan: 123 Floor findings, 72 Reflex findings. Final rendered scan: 0 Floor, 0 open Reflex. Two exceptions: live camera preview has no poster; product cards and the smiley button keep their larger touch areas.

Preservation check: 2/2 links, 2/2 fields, 78/78 handlers, 1/1 headings. Existing routes / and /admin remain.

Visual reviewer: separate agent. Two findings resolved: reduced menu tile height and padding; restored translucent payment ribbon while retaining opaque action buttons. No hero review applies to these app screens.

Warn dispositions: import notice side stripes and combined hover effects are overridden by the shared stylesheet; text wrapping in the import mode choice is allowed for its two-part label; legacy stylesheet color and heading warnings are superseded by effective shared styles. Existing three-period loading messages remain verbatim. Dialog edge plus shadow and existing admin button hierarchy retained as established application conventions.

Verification: production build, four search tests, and browser interactions for typo search, adding a product, opening and closing the cart, ten new checks and automatic horizontal scrolling, dark theme, coffee panel, admin route, mobile overflow and browser exceptions. Browser checks use isolated storage; backend menu data changed only its normalization timestamps while loading the admin page, and is excluded from the design commit.

Local comparison: .hallmark/compare.html. Before and after screenshots are local artifacts, excluded from Git.

No image slots or additional materials required.
