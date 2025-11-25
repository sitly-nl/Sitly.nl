import Foundation
import RealmSwift

class Message: BaseServerEntity, JsonApiMappable {
    @objc dynamic var content = ""
    @objc dynamic var created = Date()
    @objc dynamic var createdRaw: String?
    @objc dynamic var jobPostingData: Data?

    @objc private dynamic var actionString = ""
    @objc private dynamic var typeString = MessageType.regular.rawValue

    convenience required init(data: JsonData, includes: [[String: Any]]? = nil) throws {
        self.init()
        id = data.id

        let attributes = data.attributes
        (try? attributes.valueForKey("content")).flatMap { content = $0 }

        createdRaw = attributes["created"] as? String
        if let created = createdRaw.flatMap({ DateFormatter.iso8601Formatter.date(from: $0) }) {
            self.created = created
        }
        (try? attributes.valueForKey("type")).flatMap { typeString = $0 }

        if let meta = data.meta {
            actionString = (try? meta.valueForKey("action")) ?? ""
        }

        if let includes = includes, let relationships = data.relationships {
            jobPosting = JsonApi.parseSingularRelationship(relationships, includes: includes, key: "jobPosting")
        }
    }
}

extension Message {
    var action: Action {
        get { return Action(rawValue: actionString) ?? .received }
        set { actionString = newValue.rawValue }
    }

    var type: MessageType {
        get { return MessageType(rawValue: typeString) ?? .regular }
        set { typeString = newValue.rawValue }
    }

    var jobPosting: JobPosting? {
        get { return jobPostingData.flatMap { try? JSONDecoder().decode(JobPosting.self, from: $0) } }
        set { jobPostingData = try? JSONEncoder().encode(newValue) }
    }

    var contentItem: (text: String, link: String?) {
        let linkDetector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = linkDetector?.matches(in: content,
                                            options: .reportCompletion,
                                            range: NSRange(location: 0, length: content.count))
        if let match = matches?.last, match.range.location + match.range.length == content.count {
            let nsString = content as NSString
            let text = nsString.substring(to: match.range.location).trimmingCharacters(in: .whitespacesAndNewlines)
            let link = nsString.substring(with: match.range)
            return (text, link)
        }
        return (content, nil)
    }

    var actionType: ActionType {
        if let link = contentItem.link {
            return .link(link)
        }
        if type == .jobPostingReply && action == .received {
            return .profile
        }
        return .none
    }
}
