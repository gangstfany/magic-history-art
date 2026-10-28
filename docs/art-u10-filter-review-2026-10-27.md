# Unit 10 filter prototype review

## P2: native select rebuild invalidates the trial's DOM cache

Location: prototypes/art-filter-trial.mjs:44-50 and the art-filter-context listener at line 76.

setOptions compares only dataset.signature, assuming it describes the current select options. The cloned native renderDependentFilterOptions also replaces typeFilter options, retaining this dataset value. A subsequent trial sync with the same logical option signature therefore skips restoring its restricted, counted list.

Browser reproduction 1: clear filters -> choose sculpture (5 works) -> open unmapped AP230. Result count stays 5/27 and the category stays sculpture, but exact type becomes 28 options (all 27 Unit10 types plus the default), without counts. This exposes painting types that are incompatible with the selected sculpture category.

Browser reproduction 2: clear -> select Triptych painting with no category -> clear. The default reverts to the native uncounted All Types label and all exact options lose their counts.

Repair: validate the actual option DOM before skipping a rebuild, or invalidate the cache on native synchronization. Add an integration regression for both native-control rebuild paths, beyond the three pure helper tests.

## Verified

All 27 Unit10 works have category coverage; overlapping AP229 membership is intentional and explained. Prototype artwork JSON exactly matches the built course. 502 art Node tests pass, but do not cover the discovered native/trial synchronization failure. At 390px all select/search controls are 44px high and no horizontal overflow occurs. No other definite new functional defect identified in this review. Formal filtering remains unchanged and the prototype remains excluded from the release artifact.

This was review only: no functional edits, commit or push.

## Fixed locally on 2026-10-28

The option synchronizer now compares actual option values and visible text against the required list, rather than trusting dataset.signature. Native course rebuilds are detected and corrected while retaining the selected value. The trial module URL was bumped to v3 to avoid loading its old cached code.

Two regression tests were observed failing before the fix. They reproduce native replacement after AP230 selection and native replacement after clearing only an exact type. Both now pass. Browser verification: sculpture -> AP230 retains exactly five counted types plus the default; clearing Triptych painting restores all 27 counted types plus the default, with status 27/27 and no page errors.

The full art suite passes 504 tests. This changes only the Unit10 prototype synchronization and its tests; the formal course has not adopted category filtering. No commit or push.
