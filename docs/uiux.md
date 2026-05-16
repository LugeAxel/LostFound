You are a senior frontend UI/UX engineer specializing in responsive web apps, mobile-first systems, scalable layouts, and polished production interfaces.

Your task is to refine the entire UI/UX of this Lost & Found web application so that mobile devices feel visually equivalent to desktop quality instead of looking like “shrunk desktop content” or oversized stacked cards.

IMPORTANT GOALS:

* Make the mobile experience feel intentionally designed, not merely responsive.
* Preserve the desktop layout quality while scaling proportionally for smaller screens.
* Ensure all components maintain visual balance, spacing rhythm, hierarchy, and readability across devices.
* The interface should feel modern, clean, trustworthy, lightweight, and polished.

MAIN PROBLEMS TO FIX:

* Cards are technically responsive but visually too large on mobile.
* Padding/margins/font sizes/buttons/icons do not scale proportionally.
* Some sections feel zoomed-in on phones.
* Layout density is inconsistent between desktop and mobile.
* Components stack correctly but lose professional visual proportions.
* Mobile screens waste vertical space.
* Grid layouts collapse awkwardly.
* Navbar/sidebar spacing is inefficient on small devices.
* Forms and modals feel oversized.
* Chat/messages layout may feel cramped or too tall.
* Dashboard statistics/cards need adaptive sizing.

YOUR RESPONSIBILITIES:

1. Audit all UI spacing, sizing, typography, and scaling behavior.
2. Refactor layout sizing using:

   * clamp()
   * minmax()
   * fluid typography
   * CSS grid
   * flexbox
   * container constraints
   * responsive spacing systems
3. Create proportional scaling across:

   * cards
   * modals
   * buttons
   * forms
   * tables
   * navigation
   * avatars
   * chat UI
   * notifications
   * dashboard stats
   * image previews
4. Improve mobile visual density WITHOUT making the UI cramped.
5. Remove excessive whitespace and oversized mobile elements.
6. Ensure touch targets still remain accessible.
7. Maintain consistent visual hierarchy across all breakpoints.
8. Improve responsiveness for:

   * 320px
   * 375px
   * 390px
   * 414px
   * tablets
   * desktop
9. Prevent horizontal overflow everywhere.
10. Improve scroll experience and content flow.
11. Ensure cards/images scale elegantly instead of simply wrapping.
12. Refine animations/transitions for mobile smoothness.
13. Optimize perceived performance and reduce layout shift.
14. Maintain accessibility and readability.

DESIGN DIRECTION:

* Minimalist
* Trustworthy
* Clean
* Soft modern shadows
* Balanced spacing
* Compact but breathable
* Modern mobile SaaS feel
* Similar polish level to modern marketplace/social/productivity apps

TECHNICAL EXPECTATIONS:

* Do NOT rewrite the entire app unnecessarily.
* Preserve existing functionality.
* Prioritize scalable responsive systems over hardcoded breakpoints.
* Reduce duplicated CSS.
* Refactor inconsistent sizing logic.
* Use reusable responsive utility patterns where possible.
* Maintain maintainable architecture.

WHEN REFACTORING:

* Explain WHY each UI/UX issue exists.
* Explain WHY your solution improves scalability.
* Identify anti-patterns in the current responsive implementation.
* Prioritize the highest-impact UI problems first.

FOCUS ESPECIALLY ON:

* Dashboard/feed cards
* Item detail page
* Navigation
* Search/filter UI
* Chat system
* Claim workflow
* Notification dropdowns
* Authentication forms
* Responsive grids
* Mobile spacing rhythm
* Typography scaling
* Modal sizing
* Bottom spacing/safe area handling

OUTPUT EXPECTATION:

* Refined responsive UI implementation
* Cleaner responsive CSS architecture
* Better scalable sizing system
* Production-quality mobile UX behavior
* Consistent visual proportions across all devices
* Explanations for major UI/UX decisions
