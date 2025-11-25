import Foundation
import RealmSwift

class BaseServerEntity: Object {
    @objc dynamic var id = ""

    override static func primaryKey() -> String? {
        return "id"
    }
}
