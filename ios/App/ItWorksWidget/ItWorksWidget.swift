import SwiftUI
import WidgetKit

/// One starred goal. `current` is shown on the left and `target` on the right.
struct GoalItem: Decodable {
    let title: String
    let current: String
    let target: String
}

struct GoalSnapshot: Decodable {
    let goals: [GoalItem]
}

struct GoalEntry: TimelineEntry {
    let date: Date
    let goals: [GoalItem]
}

struct GoalProvider: TimelineProvider {
    func placeholder(in context: Context) -> GoalEntry {
        GoalEntry(date: Date(), goals: [GoalItem(title: "Παράδειγμα", current: "1", target: "4")])
    }

    func getSnapshot(in context: Context, completion: @escaping (GoalEntry) -> Void) {
        completion(load())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<GoalEntry>) -> Void) {
        let entry = load()
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date().addingTimeInterval(1800)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func load() -> GoalEntry {
        let raw = UserDefaults(suiteName: "group.com.statego2.itworks")?.string(forKey: "goldSnapshot") ?? ""
        let goals = (try? JSONDecoder().decode(GoalSnapshot.self, from: Data(raw.utf8)))?.goals ?? []
        return GoalEntry(date: Date(), goals: goals)
    }
}

struct GoldWidgetView: View {
    var entry: GoalEntry

    var body: some View {
        let stack = VStack(alignment: .leading, spacing: 8) {
            Text("Χρυσοί στόχοι")
                .font(.headline)
                .foregroundStyle(Color(red: 0.322, green: 0.275, blue: 0.663))
            if entry.goals.isEmpty {
                Text("Σημείωσε έναν στόχο με το αστέρι.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(Array(entry.goals.prefix(3).enumerated()), id: \.offset) { _, goal in
                    VStack(alignment: .leading, spacing: 2) {
                        Text(goal.title)
                            .font(.caption)
                            .lineLimit(1)
                        HStack(alignment: .firstTextBaseline) {
                            VStack(alignment: .leading, spacing: 1) {
                                Text("ΤΩΡΑ")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(.secondary)
                                Text(goal.current)
                                    .font(.caption.weight(.semibold))
                                    .lineLimit(1)
                            }
                            Spacer(minLength: 8)
                            VStack(alignment: .trailing, spacing: 1) {
                                Text("ΣΤΟΧΟΣ")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(.secondary)
                                Text(goal.target)
                                    .font(.caption.weight(.semibold))
                                    .lineLimit(1)
                            }
                        }
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .modifier(WidgetSurface())
        return stack
    }
}

/// iOS 17 wants containerBackground. Earlier systems use a normal background.
struct WidgetSurface: ViewModifier {
    @ViewBuilder
    func body(content: Content) -> some View {
        let fill = Color(red: 0.965, green: 0.969, blue: 0.984)
        if #available(iOS 17.0, *) {
            content.containerBackground(fill, for: .widget)
        } else {
            content.background(fill)
        }
    }
}

struct ItWorksGoldWidget: Widget {
    let kind = "ItWorksGoldWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: GoalProvider()) { entry in
            GoldWidgetView(entry: entry)
        }
        .configurationDisplayName("It Works")
        .description("Οι χρυσοί στόχοι: τώρα αριστερά, στόχος δεξιά.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct ItWorksWidgetBundle: WidgetBundle {
    var body: some Widget {
        ItWorksGoldWidget()
    }
}
