import Foundation

enum PromptType: String {
    case avatarReminder
    case availabilityReminder
    case noAvailabilityReminder
    case negativeReview
    case positiveReview
    case firstRecommendation
    case newApplication
    case avatarOverlay
}

class Prompt: JsonApiMappable {
    var type: PromptType
    var delay: Double?

    required init(data: JsonData, includes: [[String: Any]]? = nil) throws {
        let attributes = data.attributes
        if let type = try PromptType(rawValue: attributes.valueForKey("type")) {
            self.type = type
        } else {
            throw ParsingError.general
        }
        delay = try? attributes.valueForKey("delay")
    }
}

extension Notification.Name {
    static let jobPostingStateChanged = Notification.Name("jobPostingStateChanged")
}
