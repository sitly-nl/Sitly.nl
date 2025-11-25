import Foundation

class Availability: Codable, Equatable {
    var days = [Day: [DayPart]]()

    subscript(index: Int) -> (day: Day, parts: [DayPart]) {
        let day = Day.allCases[index]
        let parts = days[day] ?? []
        return (day, parts)
    }

    init() {}
    init(dict: [String: Any]) {
        for (key, value) in dict {
            guard
                let day = Day(rawValue: key),
                let dayParts: [DayPart] = (value as? [String: Any])?.compactMap({
                    if let dayPart = DayPart(rawValue: $0), ($1 as? Bool) == true {
                        return dayPart
                    }
                    return nil
                }),
                dayParts.count > 0
            else { continue }
            days[day] = dayParts
        }
    }

    var serverDictionaryRepresentation: [String: [String: Bool]] {
        return Day.allCases.reduce(into: [:]) { res, day in
            res[day.rawValue] = DayPart.allCases.reduce(into: [:]) { dayParts, dayPart in
                dayParts[dayPart.rawValue] = days[day]?.contains(dayPart) ?? false
            }
        }
    }

    static func == (lhs: Availability, rhs: Availability) -> Bool {
        return !Day.allCases.contains {
            lhs.days[$0]?.sorted() != rhs.days[$0]?.sorted()
        }
    }
}

extension Availability {
    var shortDescription: String {
        return Day.allCases
            .compactMap { (days[$0]?.count ?? 0) > 0 ? $0.shortLocalized : nil }
            .aggregatedDescription()
    }

    func isAvailable() -> Bool {
        return days.contains { $0.1.count > 0 }
    }

    func enableAllDayParts(for day: Day) {
        days[day] = DayPart.allCases
    }

    func disableAllDayParts(for day: Day) {
        days[day] = []
    }

    func enableDayPart(_ part: DayPart, for day: Day) {
        if var parts = days[day], !parts.contains(part) {
            parts.append(part)
            days[day] = parts
        } else {
            days[day] = [part]
        }
    }

    func disableDayPart(_ part: DayPart, for day: Day) {
        if let index = days[day]?.firstIndex(of: part) {
            days[day]?.remove(at: index)
        }
    }
}
