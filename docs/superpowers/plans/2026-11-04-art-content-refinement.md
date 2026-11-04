# Art content refinement implementation plan

Goal: implement the user's approved audit corrections without changing layout, media, geography, identities or existing interaction work.
Architecture: authored target-specific comparisons in the existing artwork JSON; neutral fallback copy; exact reviewed-change ledger lets historical snapshot tests continue checking every unedited field.
Tech stack: existing static HTML, JavaScript modules, Node and Python checks.

- [x] Correct AP28/104/110/143 copy and verify AP152 against the saved institutional/architectural sources.
- [x] Author specific comparisons for all existing U1–U4 entry points; replace weak consecutive-number pairs with evidence-based targets. Preserve useful pairs and cross-Unit targets.
- [x] Add a regression test preventing unsupported categorical claims in fallback text before changing that fallback.
- [x] Keep an exact field-change record, retain the pre-review fixtures, verify all identities/media/U5–U10 unchanged.
- [x] Run full documented tests, strict validation, public build; inspect browser comparison, images, mobile and return behavior.
- [x] Save final review and preview. No commit or push in this request.
