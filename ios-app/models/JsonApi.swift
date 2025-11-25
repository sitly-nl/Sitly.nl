import Foundation

protocol JsonApiMappable {
    init(data: JsonData, includes: [[String: Any]]?) throws
}

struct JsonData {
    let id: String
    let attributes: [String: Any]
    let meta: [String: Any]?
    let links: [String: String]?
    let relationships: [String: Any]?

    init(dict: [String: Any]) throws {
        id = try dict.valueForKey("id")
        attributes = try dict.valueForKey("attributes")
        meta = try? dict.valueForKey("meta")
        links = try? dict.valueForKey("links")
        relationships = try? dict.valueForKey("relationships")
    }
}

struct JsonApiObject {
    private(set) var object: Any?
    private(set) var data: Any?
    private(set) var included: [[String: Any]]?
    private(set) var meta: [String: Any]?
    private(set) var links: [String: Any]?

    init(_ object: Any) {
        self.object = object

        if let dict = object as? [String: Any] {
            data = dict["data"]
            included = try? dict.valueForKey("included")
            meta = try? dict.valueForKey("meta")
            links = try? dict.valueForKey("links")
        }
    }

    func single<T: JsonApiMappable>() -> T? {
        return (data as? [String: Any]).flatMap { try? T.init(data: JsonData(dict: $0), includes: included) }
    }

    func multiple<T: JsonApiMappable>() -> [T] {
        return (data as? [[String: Any]])?.compactMap { try? T.init(data: JsonData(dict: $0), includes: included) } ?? []
    }
}

class JsonApi {
    class func parseSingularRelationship<T: JsonApiMappable>(_ relationships: [String: Any], includes: [[String: Any]], key: String) -> T? {
        let data = try? relationships
            .valueForKey(key, ofType: [String: Any].self)
            .valueForKey("data", ofType: [String: Any].self)
        return data.flatMap { JsonApi.parseItem(data: $0, includes: includes) }
    }

    class func parseMultipleRelationship<T: JsonApiMappable>(_ relationships: [String: Any], includes: [[String: Any]], key: String) -> [T] {
        let datas = try? relationships
            .valueForKey(key, ofType: [String: Any].self)
            .valueForKey("data", ofType: [[String: Any]].self)
        return datas?.compactMap { JsonApi.parseItem(data: $0, includes: includes) } ?? []
    }

    private class func parseItem<T: JsonApiMappable>(data: [String: Any], includes: [[String: Any]]) -> T? {
        let itemId = data["id"] as? String
        let itemType = data["type"] as? String
        return includes
            .first(where: {
                $0["type"] as? String == itemType &&
                $0["id"] as? String == itemId
            })
            .flatMap {
                try? T.init(data: JsonData(dict: $0), includes: includes)
            }
    }

    class func dataForSingularRelationship(
        _ relationships: [String: Any],
        includes: [[String: Any]],
        key: String
    ) -> [String: Any]? {
        let data = try? relationships
            .valueForKey(key, ofType: [String: Any].self)
            .valueForKey("data", ofType: [String: Any].self)
        return data.flatMap { JsonApi.dataItem(data: $0, includes: includes) }
    }

    private class func dataItem(data: [String: Any], includes: [[String: Any]]) -> [String: Any]? {
        let itemId = data["id"] as? String
        let itemType = data["type"] as? String
        return includes
            .first(where: {
                $0["type"] as? String == itemType &&
                $0["id"] as? String == itemId
            })
    }
}
