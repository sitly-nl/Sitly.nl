import Foundation

enum ExperienceAgeGroup: String, Comparable {
    case youngerThanOne = "0", oneToThree = "1-3", fourToSix = "4-6", sevenToEleven = "7-11", twelveAndOlder = "12plus"

    static let values: [ExperienceAgeGroup] = [.youngerThanOne, .oneToThree, .fourToSix, .sevenToEleven, .twelveAndOlder]

    var localized: String {
        return "experienceAgeGroup\(self.rawValue.replacingOccurrences(of: "-", with: "_"))".localized
    }
    var localizedShort: String {
        return "experienceAgeGroup\(self.rawValue.replacingOccurrences(of: "-", with: "_")).short".localized
    }

    var short: String {
        switch self {
        case .youngerThanOne:
            return "< 1"
        case .oneToThree:
            return "1 - 3"
        case .fourToSix:
            return "4 - 6"
        case .sevenToEleven:
            return "7 - 11"
        case .twelveAndOlder:
            return "> 12"
        }
    }

    var sortIndex: Int {
        switch self {
        case .youngerThanOne:
            return 0
        case .oneToThree:
            return 1
        case .fourToSix:
            return 2
        case .sevenToEleven:
            return 3
        case .twelveAndOlder:
            return 4
        }
    }

    static func < (lhs: ExperienceAgeGroup, rhs: ExperienceAgeGroup) -> Bool {
        return lhs.sortIndex < rhs.sortIndex
    }
}
