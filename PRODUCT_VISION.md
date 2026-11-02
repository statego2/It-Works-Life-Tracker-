# Product Vision — It Works: Life Tracker

## North star
> Open the app and see **my actual life beside the life I chose** — clearly, honestly, and across all the areas that matter to me.

Not a generic to-do list. Not a moral or psychological evaluation. Not an AI that tells someone which desires are valid. It is a self-configurable **personal life model** with history.

## What makes it different?
1. **Two parallel representations of life:** current observations and desired conditions.
2. **Truly arbitrary user-created folders and metrics:** no mandatory template or preselected domains.
3. **Standards and goals coexist:** standards are maintained over time; goals describe milestones to reach.
4. **Heterogeneous evidence:** 1 versus 4 friends, yes versus no relationship, 1 versus 2 fasts/week, income and budget allocations can all appear without pretending they measure the same thing.
5. **Whole-life visibility before advice:** recommendations derive from the user's own model, but visibility is useful even without recommendations.
6. **Evolution:** observations and desired states have histories, so users can distinguish progress from revised aspirations.

## Illustrative fictional examples (NOT seeded personal data)
| Folder | Type | Current (LEFT) | Standard / Goal (RIGHT) |
| --- | --- | --- | --- |
| Relationships | Standard | 1 close friend available to meet often | 4 close friends available to meet often |
| Relationships | Goal | No partner | In a relationship |
| Spirituality | Standard | 1 day of fasting per week (reported) | 2 days per week |
| Finances | Goal | €100 monthly income | €2,000 monthly income |
| Finances | Standard | Personal expenses partly covered | Personal expenses fully covered |
| Finances | Standard | 5% of income saved | 20% saved |
| Life administration | Goal | No job | Has a job |

These are labels and quantities defined by the hypothetical user, **not** societal standards, and not instructions to anyone else.

## Experience pillars
### Define
- Add, rename, reorder and archive arbitrary folders, e.g. "Economics," "Relationships," "Learning," or a custom title.
- Inside each, add as many standards/goals as needed.
- Each metric's descriptive wording remains the user's own; the system must not overwrite the meaning of e.g. "close friends I can meet frequently."
- Give metrics different units, thresholds, and data types.

### Observe
- Enter the actual value quickly: number, binary answer, occurrence frequency, percentage, monetary amount, or later a custom status/milestone.
- Label the observation date and store an append-only observation trail (with correction support).
- A current value is the latest recorded observation, not automatic proof of today's truth.
- Support explicit "unknown/not updated" states.

### Compare
- Side-by-side comparison always reads **Current LEFT | Target RIGHT**.
- For quantitative metrics, show exact absolute gap and optional normalized progress only where valid.
- For yes/no and qualitative metrics, report match/non-match or user-authored state, not fabricated percentages.
- For routines, compare target frequency to an actually observed relevant time window with clear coverage.
- Flag stale/insufficient observations rather than guessing.

### Reflect
- Overview of everything, grouped by folder, with clear achieved/not-yet/unknown statuses.
- Optional trend and target history.
- No assumed universal composite life progress number.

### Act (later, optional)
- Add self-chosen priorities, next steps, dependencies, and flexible 5-/10-year plans.
- Recommendations should be explainable, reversible, and explicitly optional.
- The app never imposes values on personal relationships, financial decisions or spiritual practice.

## Examples of user stories
- "I want to define 4 close friends I can see regularly as my target even if the app would otherwise have preferred a different measure."
- "I need to know if I am fasting once or twice a week without marking an entire unlogged week as failure."
- "I want income, expense responsibility and allocation percentages in the same financial folder."
- "I want to change my desired state without erasing what I formerly aimed for."
- "I want the project to start as a web app but remain architecturally portable to iOS/Android."

## Boundaries
A life does not reduce to a total score. A goal is not an obligation to optimize without consent. Negative gaps should not be expressed as shame, urgency, or moral defects. UI style, dashboard structure, progress visualization and the final brand language remain subject to dedicated design work.

## Product positioning (working hypothesis)
**A customizable life gap dashboard**, offering a single trusted picture of personal aspirations versus actual conditions. Initial product-market fit is **unvalidated**; build for personal use first and learn from real usage before committing to monetization or scaling.
