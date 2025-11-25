import Foundation
import RealmSwift
import CoreLocation

class UsersGroups: BaseServerEntity, JsonApiMappable {
    @objc dynamic var count: Int = 0
    @objc dynamic var latitude: Double = 0
    @objc dynamic var longitude: Double = 0

    convenience required init(data: JsonData, includes: [[String: Any]]?) throws {
        self.init()
        id = data.id

        let attributes = data.attributes
        count = try attributes.valueForKey("count")
        latitude = try attributes.valueForKey("latitude")
        longitude = try attributes.valueForKey("longitude")
    }
}

extension UsersGroups {
    var coordinate: CLLocationCoordinate2D {
        return CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}
