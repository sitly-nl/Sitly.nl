import Foundation
import RealmSwift

class Language: Object, Codable {
    @objc dynamic var name = ""
    @objc dynamic var code = ""

    override static func primaryKey() -> String? {
        return "code"
    }

    override func isEqual(_ object: Any?) -> Bool {
        return code == (object as? Language)?.code
    }

    convenience required init(dict: [String: Any], includes: [[String: Any]]? = nil) throws {
        self.init()
        name = try dict.valueForKey("name")
        code = try dict.valueForKey("code")
    }
}
