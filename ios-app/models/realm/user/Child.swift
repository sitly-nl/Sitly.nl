import UIKit.UIImage
import Foundation
import RealmSwift

enum ChildTrait: String, CaseIterable {
    case calm
    case energetic
    case quiet
    case talkative
    case creative
    case sporty
    case curious
    case funny
    case mischievous
    case stubborn

    var localized: String {
        return "childTraits.\(rawValue)".localized
    }
}

class Child: BaseServerEntity, JsonApiMappable {
    static let maxChildrenCount = 4
    static let maxAge = 14
    @objc dynamic var birthDate: Date?
    @objc dynamic var age = 0

    @objc private dynamic var genderString = Gender.unknown.rawValue
    let traitsRawValues = List<String>()

    convenience required init(data: JsonData, includes: [[String: Any]]? = nil) throws {
        self.init()
        id = data.id

        let attributes = data.attributes
        (try? attributes.valueForKey("age")).flatMap { age = $0 }
        (try? attributes.valueForKey("gender")).flatMap { genderString = $0 }
        (attributes["birthdate"] as? String)
            .flatMap { DateFormatter.iso8601Formatter.date(from: $0) }
            .flatMap { birthDate = $0 }

        (attributes["traits"] as? [String])?
            .compactMap { $0 }
            .forEach { traitsRawValues.append($0) }
    }
}

extension Child {
    var gender: Gender {
        get { return Gender(rawValue: genderString) ?? .unknown }
        set { genderString = newValue.rawValue }
    }

    var icon: UIImage? {
        switch (age, gender) {
        case (..<2, _):
            return #imageLiteral(resourceName: "Child0-1")
        case (..<4, _):
            return #imageLiteral(resourceName: "Child2-3")
        case (..<7, _):
            return #imageLiteral(resourceName: "Child4-6")
        case (..<11, .female):
            return #imageLiteral(resourceName: "Child7-11.girl")
        case (..<11, .male):
            return #imageLiteral(resourceName: "Child7-11.boy")
        case (12..., .female):
            return #imageLiteral(resourceName: "Child12.girl")
        case (12..., .male):
            return #imageLiteral(resourceName: "Child12.boy")
        default:
            return #imageLiteral(resourceName: "Child12.boy")
        }
    }

    var iconSmall: UIImage? {
        switch (age, gender) {
        case (..<2, _):
            return #imageLiteral(resourceName: "ChildSmall0-1")
        case (..<4, _):
            return #imageLiteral(resourceName: "ChildSmall2-3")
        case (..<7, _):
            return #imageLiteral(resourceName: "ChildSmall4-6")
        case (..<11, .female):
            return #imageLiteral(resourceName: "ChildSmall7-11.girl")
        case (..<11, .male):
            return #imageLiteral(resourceName: "ChildSmall7-11.boy")
        case (12..., .female):
            return #imageLiteral(resourceName: "ChildSmall12.girl")
        case (12..., .male):
            return #imageLiteral(resourceName: "ChildSmall12.boy")
        default:
            return #imageLiteral(resourceName: "ChildSmall12.boy")
        }
    }

    var traits: [ChildTrait] {
        get {
            return traitsRawValues.compactMap { ChildTrait(rawValue: $0) }
        }
        set {
            traitsRawValues.removeAll()
            newValue.forEach { traitsRawValues.append($0.rawValue) }
        }
    }
}
