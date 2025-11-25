import Foundation
import RealmSwift

class Reference: BaseServerEntity, JsonApiMappable {
    @objc dynamic var familyName = ""
    @objc dynamic var referenceDescription = ""
    let user = LinkingObjects(fromType: User.self, property: "references")

    convenience required init(data: JsonData, includes: [[String: Any]]?) throws {
        self.init()
        id = data.id

        let attributes = data.attributes
        familyName = try attributes.valueForKey("familyName")
        referenceDescription = try attributes.valueForKey("description")
    }
}
