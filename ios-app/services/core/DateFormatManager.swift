import UIKit

class DateFormatManager {
    static let shared = DateFormatManager()
    var formatters = [String: DateFormatter]()

    /// Gets a dateformatter, also cache formatter so it performs better.
    ///
    /// - Parameters:
    ///   - format: Date format, like 'YYYY-MM-dd'.
    ///   - timeZone: Timezone info.
    ///   - locale: The locale to format in.
    ///   - dateStyle: The style of the date.
    ///   - timeStyle: The style of the time.
    /// - Returns: a dateformatter.
    func formatter(
        _ format: String,
        timeZone: TimeZone? = TimeZone.current,
        locale: Locale = Locale.current,
        dateStyle: DateFormatter.Style = .none,
        timeStyle: DateFormatter.Style = .none
    ) -> DateFormatter {
        // Build the key
        let key = "\(format)\(String(describing: (timeZone as NSTimeZone?)?.hash))\(String((locale as NSLocale).hash))\(String(describing: dateStyle))\(String(describing: timeStyle))"

        // Found in cache return that one
        if let formatter = formatters[key] {
            return formatter
        }

        // Not found, create it, add to cache and return it
        let formatter = DateFormatter()

        formatter.dateFormat = format

        // Check the parameters and only set them up if they are present
        timeZone.flatMap {
            formatter.timeZone = $0
        }

        formatter.locale = locale

        if dateStyle != .none {
            formatter.dateStyle = dateStyle
        }

        if timeStyle != .none {
            formatter.timeStyle = timeStyle
        }

        // Add formatter to the dictionary so it's cached
        formatters[key] = formatter

        return formatter
    }
}
