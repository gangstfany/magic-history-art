# Complete local study images implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore all74missing specified image views for the developer's local study website, without waiting for public-image licensing work.

**Architecture:** Reuse the17existing U4/U5 local images; extract57remaining exact views from the user's supplied CED/textbooks into the already ignored `.private-media/complete/` subtree. Serve the unchanged homepage/map UI through a localhost-only study server that applies the local image manifest in memory; public HTML/data, rights labels, and GitHub remain unchanged. Every replacement retains its exact work/view ID, full image frame, source page and photographer attribution.

**Tech Stack:** pypdf, Pillow, Python standard-library HTTP server and unittest, existing Playwright verification helpers.

---

## Tasks

- [ ] Inventory74null views and reuse exact U4/U5 assets without loading the invalid legacy U5 bundle (it has two extra keys now covered publicly).
- [ ] Extract U6's11missing views, U7's1interior, U8's3views, U9's11views and U10's31views from the supplied CED. Map PDF images visually, never by filename/order alone. Preserve full frames; write per-unit ignored manifests with sourcePdf/sourcePage/sourceImage evidence.
- [ ] Add `tests/test_serve_art_history_study.py` first: public sources unchanged, local assets must exist, no unknown or duplicate keys, source credits say local study rather than open license, null counts become zero only with complete coverage. Run the new tests and observe missing implementation failure.
- [ ] Implement `scripts/serve-art-history-study.py`: replace only artwork-data/image-credit-data in the HTTP response; serve normal static files; bind127.0.0.1, no upload/external binding. Refuse incomplete manifest on startup. Use a separate4174port so the public4173preview stays available.
- [ ] Build the ignored74-entry combined manifest via an apply_patch-generated JSON update; preserve existing asset files and all public media rows.
- [ ] Verify all74files decode; verify every corresponding rendered image and dialog using Playwright in desktop/mobile standalone and homepage-embedded contexts. Audit existing nonmissing images too; report genuine broken sources separately, not as a licensing issue.
- [ ] Give the developer the working local homepage URL. No push, merge or Desktop copy.

## Execution

The user has directly authorized completing the images and deferring GitHub eligibility; execute in this chat. Independent PDF extraction is delegated by unit with disjoint ignored output directories. The main agent handles U4/U5 reuse, U7 extraction, in-memory serving and integration. Do not ask for another design approval or overwrite the existing public supplementation batch.
