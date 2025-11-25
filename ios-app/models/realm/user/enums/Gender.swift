import Foundation

enum Gender: String, Codable {
    case unknown, male, female

    var localized: String {
        return "\(full.lowercased())".localized
    }

    var localizedParent: String {
        return "parent.\(full.lowercased())".localized
    }

    var localizedChild: String {
        switch self {
        case .male:
            return "boy".localized
        case .female:
            return "girl".localized
        default:
            return "expecting".localized
        }
    }

    var localizedChildPlural: String {
        switch self {
        case .male:
            return "boys".localized
        case .female:
            return "girls".localized
        default:
            return "expecting".localized
        }
    }

    var localizedOffspring: String {
        switch self {
        case .male:
            return "son".localized
        case .female:
            return "daughter".localized
        default:
            return "expecting".localized
        }
    }

    var full: String {
        return self == .male ? "Male" : "Female"
    }

    static var allInOrder: [Gender] { [.male, .female, .unknown] }
}
