import Foundation
import RealmSwift

class Recommendation: BaseServerEntity, JsonApiMappable {
    @objc dynamic var text = ""
    @objc dynamic var score: Double = 0
    @objc dynamic var creatorName = ""
    @objc dynamic var created = Date()

    convenience required init(data: JsonData, includes: [[String: Any]]?) throws {
        self.init()
        id = data.id

        let attributes = data.attributes
        text = try attributes.valueForKey("description")
        score = try attributes.valueForKey("score")
        creatorName = try attributes.valueForKey("authorName")
        (attributes["created"] as? String).flatMap { DateFormatter.iso8601Formatter.date(from: $0) }.flatMap { created = $0 }
    }
}
