import Foundation

enum Day: String, Codable, CaseIterable, Identifiable {
    var id: String { rawValue }
    case monday, tuesday, wednesday, thursday, friday, saturday, sunday

    var localized: String {
        return self.rawValue.localized
    }

    var shortLocalized: String {
        return "\(self.rawValue)Short".localized
    }
}
