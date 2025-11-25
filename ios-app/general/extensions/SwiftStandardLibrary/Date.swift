import Foundation

let timeAgoFormatter: DateComponentsFormatter = {
    $0.unitsStyle = .full
    $0.maximumUnitCount = 1
    $0.allowedUnits = [.year, .month, .weekOfMonth, .day, .hour, .minute]
    return $0
}(DateComponentsFormatter())

let childAgeFormatter: DateComponentsFormatter = {
    $0.unitsStyle = .full
    $0.maximumUnitCount = 1
    $0.allowedUnits = [.year, .month]
    return $0
}(DateComponentsFormatter())

extension Date {
    var timeAgo: String {
        let now = Date()
        if now.timeIntervalSince(self) < 60 {
            return "now".localized
        } else {
            return ago
        }
    }

    var timeAgoNew: String {
        if isToday {
            return "today".localized
        } else if isYesterday {
            return "yesterday".localized
        } else {
            return (Country.current == Country.canada ? DateFormatter.yyMd : DateFormatter.dMyy).string(from: self)
        }
    }

    var dayFormatted: String {
        if isToday {
            return "today".localized
        } else if isYesterday {
            return "yesterday".localized
        } else {
            return DateFormatter.dMMMMyyyy.string(from: self)
        }
    }

    var onlineStatus: String {
        let now = Date()
        if now.timeIntervalSince(self) < 5*60 {
            return "online".localized
        } else {
            return ago
        }
    }

    private var ago: String {
        let ago = timeAgoFormatter.string(from: self, to: Date()) ?? ""
        guard
            let nsRange = try? NSRegularExpression(pattern: "\\A\\d* \\w*")
                .rangeOfFirstMatch(in: ago, options: [], range: NSRange(location: 0, length: ago.count)),
            let range = Range(nsRange, in: ago)
        else {
            return ago
        }
        return String(ago[range])
    }

    var childAge: String {
        return childAgeFormatter.string(from: self, to: Date()) ?? ""
    }

    func is24HoursLater(then date: Date) -> Bool {
        return self.timeIntervalSince(date) >= 86400
    }

    var age: Int? {
        return Calendar.current.dateComponents([.year], from: self, to: Date()).year
    }

    var isToday: Bool {
        return Calendar.current.isDateInToday(self)
    }

    var isYesterday: Bool {
        return Calendar.current.isDateInYesterday(self)
    }

    var isInPastWeek: Bool {
        guard let sixDaysAgo = Calendar.current.date(byAdding: .day, value: -6, to: Date()) else {
            return false
        }

        return self >= Calendar.current.startOfDay(for: sixDaysAgo)
    }

    func lessThanMinutesAgo(minutes: Int, date: Date) -> Bool {
        return abs(self.timeIntervalSince1970 - date.timeIntervalSince1970) < Double(minutes * 60)
    }

    func day(from date: Date) -> Int {
        return Calendar.current.dateComponents([.day], from: date, to: self).day ?? 0
    }

    func seconds(from date: Date) -> Int {
        return Calendar.current.dateComponents([.second], from: date, to: self).second ?? 0
    }

    func addingDays(_ days: Int) -> Date {
        return self.addComponentsToDate(seconds: 0, minutes: 0, hours: 0, days: days, weeks: 0, months: 0, years: 0)
    }

    // swiftlint:disable:next function_parameter_count
    private func addComponentsToDate(
        seconds sec: Int,
        minutes min: Int,
        hours hrs: Int,
        days: Int,
        weeks wks: Int,
        months mts: Int,
        years yrs: Int
    ) -> Date {
        var components = DateComponents()
        components.second = sec
        components.minute = min
        components.hour = hrs
        components.day = days
        components.weekOfYear = wks
        components.month = mts
        components.year = yrs
        return Calendar.autoupdatingCurrent.date(byAdding: components, to: self)!
    }
}
