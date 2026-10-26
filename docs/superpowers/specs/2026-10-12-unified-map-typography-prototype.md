# Unified map typography prototype

Approved in chat on 2026-10-12. This is a disposable, independent preview, not production integration.

- Real homepage in a same-origin iframe, with original/unified toggle and shortcuts to World event, World study detail, and Art artwork detail.
- One shared font family: PingFang SC, Hiragino Sans GB, system and Helvetica Neue fallbacks.
- Detail title 19px/800/1.3; section heading 13.5px/700/1.55; prose 13.5px/600/1.55; subtitles/metadata 12px/600/1.55; pills/tabs 12.5px/700/1.35.
- Apply only runtime preview styles to the homepage mirror and two nested map documents. Switching back removes only those preview styles and retains selected content and filters.
- Preserve layout rules, colors, images, licensing placeholders, controls, historical data and marker scaling. Text reflow is an expected result of new font metrics.
- No production file edits, commit, push or main merge.
- Verify computed styles in both subjects and World study detail, original restoration, mobile overflow and frame reload. Expose failures as visible preview status.

Spec self-review: scope is isolated, typography values match the approved chat table, no placeholders or new product rules.
