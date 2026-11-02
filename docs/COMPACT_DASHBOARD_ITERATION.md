# Compact Life Dashboard — Iteration 1

**Date:** 2026-11-02  
**Source:** Owner feedback after using the hosted first prototype.  
**Status:** First compact pass implemented in the prototype; final look remains open for iteration.

## Direct owner feedback
- Existing custom folders and gold-star goals are appreciated: **preserve them**.
- The four large overview statistic tiles (folder count, indicator count, achieved count, unknown count) **should not dominate the top of the dashboard**.
- Individual goal cards are **far too tall** and need to become small, compact items.
- For meaningful numeric comparisons, use a **horizontal fill bar**.
- A percentage below the bar can communicate progress instead of verbose wording.
- Remove the default verbose "in progress", "X remaining", etc.
- **History, update, editing and additional details appear only on opening a metric**, not in its collapsed presentation.
- Maintain **current state on the LEFT and personal standard/goal on the RIGHT**.
- Keep existing demo examples as optional illustrative data, not as mandatory standards.

## Collapsed goal/standard
- Title, star affordance.
- One-line (when space allows) **Current LEFT | Standard/Goal RIGHT** values.
- Thin progress bar + concise percentage *only* when it can be calculated honestly.
- Tap/open to reveal detail actions; keep list scannable.
- Small phone view should show multiple metrics without excessive scrolling.

## Expanded goal/standard
- Context for the measurement (kind, last observation, self-report notes).
- Buttons for **Update**, **History**, **Edit**.
- Same underlying stored observations/target history as before; this is a presentation change.

## Progress rules
- For numeric, money, percentage and frequency metrics with compatible units and positive target and a meaningful at-least comparison, the fill is `clamp(actual / target, 0, 1)`.
- Visible percentage can exceed 100% for exceeded targets; fill stops at full width.
- Do **not** invent a percentage for yes/no, missing observations, invalid/incompatible data, zero target, negative current or at-most/exact conditions where simple ratio misleads.
- Boolean comparisons show a small neutral condition status.
- A metric's progress percentage is **not** an overall life score.

## Overview order
- Purpose (only when enabled).
- Chosen gold goals when available.
- User-ordered life folders and their compact metrics.
- Aggregate statistics, if displayed, **below the main content**. Long-term, users may choose to hide them entirely.

## Visual principle
**Less text, more signal. Default = compact. Details = on tap.**

## Deferred decisions
- Final dashboard appearance, typography and spacing.
- Optional hide/show of aggregate statistics.
- Progress design for at-most/exact/boolean and noncomparable target types.
- User-configurable dashboard sections and rich vision boards.
