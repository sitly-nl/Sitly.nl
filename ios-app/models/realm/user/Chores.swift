import Foundation
import RealmSwift

enum ChoreType: String, CaseIterable {
    case chores
    case driving
    case shopping
    case cooking
    case homework

    var localized: String {
        return "chores.\(self.rawValue)".localized
    }
}

class Chores: Object, Codable {
    @objc dynamic var chores = false
    @objc dynamic var driving = false
    @objc dynamic var shopping = false
    @objc dynamic var cooking = false
    @objc dynamic var homework = false

    var selectedChores: [ChoreType] {
        get {
            var items = [ChoreType]()
            if chores {
                items.append(.chores)
            }
            if driving {
                items.append(.driving)
            }
            if homework {
                items.append(.homework)
            }
            if shopping {
                items.append(.shopping)
            }
            if cooking {
                items.append(.cooking)
            }
            return items
        }
        set {
            chores = newValue.contains(.chores)
            driving = newValue.contains(.driving)
            homework = newValue.contains(.homework)
            shopping = newValue.contains(.shopping)
            cooking = newValue.contains(.cooking)
        }
    }

    convenience required init(dict: [String: Any], includes: [[String: Any]]? = nil) throws {
        self.init()

        (try? dict.valueForKey("chores")).flatMap { chores = $0 }
        (try? dict.valueForKey("driving")).flatMap { driving = $0 }
        (try? dict.valueForKey("shopping")).flatMap { shopping = $0 }
        (try? dict.valueForKey("cooking")).flatMap { cooking = $0 }
        (try? dict.valueForKey("homework")).flatMap { homework = $0 }
    }
}

extension Chores {
    var chosenAnyChore: Bool {
        return chores || driving || shopping || cooking || homework
    }

    var serverDictionaryRepresentation: [String: Bool] {
        return [
            "chores": chores,
            "driving": driving,
            "shopping": shopping,
            "cooking": cooking,
            "homework": homework
        ]
    }
}
