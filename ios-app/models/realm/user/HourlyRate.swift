import Foundation
import RealmSwift

enum HourlyRateType: String, CaseIterable {
    case min = "4min"
    case fourSix = "4-6"
    case sixEight = "6-8"
    case eightTen = "8-10"
    case tenPlus = "10plus"
    case negotiate = "negotiate"
}

class HourlyRate: Object, Codable {
    @objc dynamic var value = ""
    @objc dynamic var label = ""

    convenience required init(dict: [String: Any]) throws {
        self.init()
        value = try dict.valueForKey("value")
        label = try dict.valueForKey("label")
    }

    override func isEqual(_ object: Any?) -> Bool {
        return value == (object as? HourlyRate)?.value
    }
}
