import Foundation

enum YearsExperience: String {
    case none = "0", one = "1", two = "2", three = "3", four = "4", five = "5", moreThanFive = "5plus"

    static let values: [YearsExperience] = [.none, .one, .two, .three, .four, .five, .moreThanFive]

    var text: String {
        if self == .moreThanFive {
            return "> 5"
        }

        return self.rawValue
    }

    var fullTitle: String {
        switch self {
        case .none:
            return "noExperience".localized
        case .one:
            return "singleYearAgo".localized
        case .moreThanFive:
            return "5plusYears".localized
        default:
            return "multipleYearsAgo".localized.replacingOccurrences(of: "%d", with: rawValue)
        }
    }

    var fullTitleExperience: String {
        switch self {
        case .none:
            return "noExperience".localized
        case .one:
            return "singleYearAgoExperience".localized
        case .moreThanFive:
            return "5plusYearsExperience".localized
        default:
            return "multipleYearsAgoExperience".localized.replacingOccurrences(of: "%d", with: rawValue)
        }
    }
}
