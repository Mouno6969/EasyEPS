# EasyEPS learner experience audit

## Current strengths

The website already has a distinctive, culturally appropriate visual system, a Bangla-first curriculum, Hangul basics, a 60-chapter catalog, local guest progress, mock tests, a planner, a dashboard, an AI tutor, certificates, and an FAQ. The homepage clearly communicates the core offer and provides strong progress-aware calls to action.

## Priority gaps observed

1. **The first-time learner path needs a clearer roadmap.** The homepage explains features but does not show a concrete sequence from Hangul to chapter study, review, mock tests, and exam readiness. A learner should be able to understand the full path in seconds.
2. **The information architecture hides useful guidance.** FAQ exists only in the footer, while the main navigation is crowded with six product destinations. High-value orientation content should be surfaced contextually without making the header heavier.
3. **The homepage lacks an actionable study routine.** Learners would benefit from explicit 15-, 30-, and 60-minute study plans and a concise explanation of how to use vocabulary, grammar, dialogue, practice, and review together.
4. **The homepage has limited trust and outcome context.** It has a disclaimer, but no concise “what EasyEPS covers / does not cover” section or direct official-resource guidance near the learning content.
5. **The learner support content is thin.** The FAQ has only six questions and its introduction is very brief. It does not yet cover account requirements, mobile/browser voice limitations, recommended daily time, mock-test strategy, review methods, data storage, profile/certificate details, or where to verify official EPS information.
6. **The onboarding tour can obscure page content.** On first visit it opens as a centered modal, including on FAQ, which can interrupt users who are trying to read. Its content is useful, but the experience should be easier to dismiss and should avoid competing with critical page orientation.
7. **Mixed English interface phrases reduce polish.** Examples include “Hangul Basics track,” “Guest progress saved,” “Mobile friendly,” “Content update,” and “Independent learning aid.” These should be localized for the Bangla-first default experience.
8. **Accessibility and credibility details can improve.** The homepage hero image uses an empty alt attribute despite communicating a learning-dashboard concept; sections need stronger semantic labels, and reduced-motion/focus behavior should be verified.

## Chosen improvement direction

Implement a stronger homepage information layer rather than adding another complex product feature. Add a visual learning roadmap, practical study-plan cards, a “how each lesson works” explanation, an exam-readiness checklist, richer learner-support links, localized trust copy, and expanded FAQ content. Keep the current navy/gold/cream editorial identity and existing backend contracts intact.

## Verified official-resource guidance

HRD Korea’s official EPS-TOPIK site explains that the test supports Korean-language proficiency assessment for foreign workers and provides official notices, schedules, results, standard textbooks, open tests, and self-study materials. The site includes two downloadable self-study books for Bangladeshi learners. EasyEPS should link learners to the official EPS-TOPIK home page and its learning-material section while clearly stating that schedules, registration, results, immigration, and employment decisions must be verified through official authorities.

| Resource | Intended use | URL |
|---|---|---|
| HRD Korea EPS-TOPIK | Official notices, schedules, test information, results, and learning materials | https://epstopik.hrdkorea.or.kr/epstopik/home/main/mainPage.do?lang=en |
| HRD Korea self-study materials | Official textbooks and downloadable Bangladeshi self-study books | https://epstopik.hrdkorea.or.kr/epstopik/book/self/ebookIndex.do?lang=en |
| Employment Permit System | Government EPS worker services and links to EPS-TOPIK | https://www.eps.go.kr |

## Visual verification — improved homepage

The refreshed homepage renders successfully with the expanded top navigation, accessible skip link, localized trust copy, four-step learning roadmap, three study routines, five-part lesson method, selected curriculum chapters, readiness checklist, official-resource links, and expanded footer. The desktop hero remains visually balanced and the added information begins below the existing metrics, preserving the original first-screen hierarchy. The onboarding now shows four steps and can be dismissed; once closed, the page is unobstructed. All expected internal and external calls to action are present in the rendered DOM.

One content issue found during verification: the lesson-method list uses a semantic ordered list and also prints a numeric prefix in each item, causing duplicate numbers in text extraction. Remove the manual number prefix so screen readers and extracted content announce each step only once.

## Visual verification — support center

The expanded FAQ renders correctly without triggering the homepage onboarding. The page shows all 17 questions, five category filters, the quick-start card, and three official resource links in a clear two-column desktop layout. The search interaction was tested with “অডিও” and correctly reduced the results to the matching browser-audio answer while exposing a clear reset control. The active FAQ navigation state is visible, accordion labeling is present, and the page remains substantially shorter when filtered.

## Mobile verification — homepage first viewport

At 390 × 844, the compact header, coach ribbon, Bengali hero typography, and first-visit onboarding all fit within the viewport without horizontal clipping. The onboarding becomes a bottom sheet with readable spacing and accessible dismissal/next actions; the underlying hero remains correctly stacked for mobile. The initial automated capture occurred before asynchronous data loaded, so the screenshot procedure was repeated with a render-time allowance and then verified successfully.

## Mobile verification — support center

At 390 × 844, the FAQ hero, result-count badge, search field, and all five category filters stack cleanly without horizontal overflow. Bengali headings remain readable, the search field retains a useful example prompt, and filter buttons wrap into balanced rows with comfortable touch targets. The first viewport clearly establishes both the page purpose and the available ways to find an answer.

## Final verification

The final implementation passes the TypeScript checker, all **8 test files / 98 tests**, and the production build. `git diff --check` reports no whitespace errors. The production build retains the repository’s existing non-blocking warning that several generated chunks exceed 500 kB; this does not prevent a successful build and was not introduced as a functional regression by the learner-content work.
