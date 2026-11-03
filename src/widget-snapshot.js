import { compareMetric, formatValue, orderedGoldMetrics } from "./domain.js";

function shown(value) {
  return value ? formatValue(value) : "Δεν έχει καταγραφεί";
}

/** Small snapshot for the home-screen widget. Current is the left field, target the right field. */
export function goldWidgetSnapshot(workspace) {
  const goals = orderedGoldMetrics(workspace).slice(0, 4).map((metric) => {
    const result = compareMetric(metric);
    return {
      title: metric.title,
      current: shown(result.actual?.value),
      target: shown(result.target?.value),
    };
  });
  return { goals };
}
