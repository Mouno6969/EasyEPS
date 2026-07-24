# EasyEPS learner experience improvement plan

## Product direction

The improved experience will preserve EasyEPS’s existing **Bangla-first editorial learning identity**—cream paper surfaces, deep navy, muted gold, sage accents, and Bengali serif display typography—while making the site more useful to first-time and returning learners. The implementation will emphasize practical orientation rather than adding another isolated feature.

## Information architecture

| Surface | Improvement | Learner outcome |
|---|---|---|
| Homepage hero | Localize remaining English utility phrases, improve the hero image description, and add a concise “no account required” reassurance | Learners immediately understand how to begin and what is saved |
| Learning roadmap | Add a four-stage path: Hangul foundations, structured lessons, targeted review, and timed mock tests | Learners understand the full journey instead of seeing disconnected features |
| Study routine | Add 15-, 30-, and 60-minute study-plan cards with exact actions | Learners can translate intention into a realistic daily habit |
| Lesson method | Explain the five-part lesson loop: vocabulary, grammar, dialogue/listening, practice, and exam/review | Learners know how to use each chapter effectively |
| Readiness guidance | Add a concise exam-readiness checklist with links to mock tests, the planner, and the dashboard | Learners can judge what to do next without treating an unofficial score as an official result |
| Official resources | Add a clearly separated official-information card linking to HRD Korea EPS-TOPIK, self-study materials, and EPS | Learners know where to verify schedules, registration, results, and official policy |
| FAQ | Expand into categorized learner support with search/filtering, more complete answers, and official-resource links | Common setup, study, account, browser, certificate, and official-process questions are answered in one place |
| Footer and global accessibility | Localize trust copy, add a skip-to-content link, ensure the main region has an anchor, improve focus states, and respect reduced-motion preferences | The experience is more coherent, keyboard-friendly, and accessible |

## Content principles

All learner-facing copy will remain **Bangla-first**, with Korean and English used only where they directly support learning. Claims will be limited to functionality present in the repository. Official schedules, registration, results, immigration, and employment policy will never be reproduced as static advice; instead, the site will direct learners to the authoritative services.

> EasyEPS teaches and supports preparation. Official authorities remain the source of truth for examination administration, employment, immigration, and legal decisions.

## Technical scope

The work will be frontend-only and will preserve all existing tRPC contracts, curriculum content, progress logic, and authentication behavior. New sections will use semantic HTML, existing design tokens, Lucide icons, and Wouter links. External official links will open safely with `target="_blank"` and `rel="noreferrer"`. No new database migration or API dependency is required.

## Verification criteria

The implementation is complete when TypeScript checking, Vitest, production build, and the content audit pass; the homepage and FAQ render correctly on desktop and mobile; keyboard focus remains visible; first-time onboarding does not prevent page navigation; all internal and official links are valid; and no placeholder interaction is introduced.
