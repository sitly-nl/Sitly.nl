import Foundation
import CoreGraphics
import RealmSwift

class Photo: BaseServerEntity, JsonApiMappable {
    @objc dynamic var link = ""

    convenience required init(data: JsonData, includes: [[String: Any]]?) throws {
        self.init()
        id = data.id
        if let link: String = data.links.flatMap({ try? $0.valueForKey("photo") }) {
            self.link = link
        } else {
            throw ParsingError.general
        }
    }
}

extension Photo {
    func photoUrl(imageSize: CGFloat) -> String {
        return link.replacingOccurrences(of: ".jpg", with: "-\(serverImageSize(viewSize: imageSize)).jpg")
    }
}
