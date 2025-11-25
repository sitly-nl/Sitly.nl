import UIKit

enum Country: String, CaseIterable {
    case argentina = "ar"
    case canada = "ca"
    case belgium = "be"
    case brazil = "br"
    case colombia = "co"
    case denmark = "dk"
    case finland = "fi"
    case germany = "de"
    case italy = "it"
    case malaysia = "my"
    case mexico = "mx"
    case netherlands = "nl"
    case norway = "no"
    case spain = "es"

    static var current: Country {
        return UserDefaults.countryCode.flatMap({ Country(rawValue: $0)}) ?? Country.netherlands
    }

    static var values: [Country] {
        return allCases.sorted { $0.rawValue.localized < $1.rawValue.localized }
    }

    var showCity: Bool {
        return self != .brazil && self != .malaysia
    }

    var showPostalCode: Bool {
        return self == .mexico || self == .germany
    }

    var showBuildingNumber: Bool {
        return self != .colombia
    }

    var postalCodeOnSeparateScreen: Bool {
        return self == .brazil || self == .malaysia
    }

    var postalCodeLength: Int {
        switch self {
        case .brazil:
            return 9
        case .malaysia, .germany:
            return 5
        default:
            return 0
        }
    }

    var allowedCharacterSetForPostalCode: CharacterSet {
        switch self {
        case .brazil:
            return CharacterSet(charactersIn: "1234567890-")
        default:
            return CharacterSet(charactersIn: "1234567890")
        }
    }

    var streetPlaceholder: String {
        switch self {
        case .malaysia:
            return "Address line 1".localized
        case .colombia:
            return "Type your street + no".localized
        default:
            return "Type your street".localized
        }
    }

    var houseNumberPlaceholder: String {
        switch self {
        case .malaysia:
            return "Address line 2".localized
        default:
            return "№"
        }
    }

    var freePremium: Bool {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let date = dateFormatter.date(from: "2022-03-02") ?? Date()
        return self == .germany && date > Date()
    }
}
