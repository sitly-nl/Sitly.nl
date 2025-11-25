import Foundation

enum MailInterval: String {
    case never, daily, weekly

    static let values: [MailInterval] = [.never, .daily, .weekly]

    var localized: String {
        return rawValue.localized
    }
}
