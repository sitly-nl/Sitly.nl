//
//  MessageDTO.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

struct MessageDTO: JsonApiMappable, Identifiable {
    let id: String
    let content: String
    let created: Date
    let createdRaw: String?
    let action: Action
    let type: MessageType

    var time: String {
        DateFormatter.HHmm.string(from: created)
    }

    init(data: JsonData, includes: [[String: Any]]? = nil) throws {
        id = data.id
        let attributes = data.attributes
        content = (try? attributes.valueForKey("content")) ?? ""

        createdRaw = attributes["created"] as? String
        if let created = createdRaw.flatMap({ DateFormatter.iso8601Formatter.date(from: $0) }) {
            self.created = created
        } else {
            self.created = Date()
        }

        let typeString: String = (try? attributes.valueForKey("type")) ?? ""
        type = MessageType(rawValue: typeString) ?? .regular

        guard let meta = data.meta else {
            throw ParsingError.missingField("meta")
        }
        let actionString = (try? meta.valueForKey("action")) ?? ""
        action = Action(rawValue: actionString) ?? .received
    }

    var canBePresentedInChat: Bool {
        return type == .regular || type == .autoRejection
    }
}

enum MessageType: String {
    case regular
    case askRecommendation
    case jobPostingReply
    case jobPostingRejection
    case safetyTips
    case instantJob
    case autoRejection
}

enum Action: String {
    case sent, received
}

enum ActionType {
    case none
    case link(String)
    case profile

    var isNone: Bool {
        if case .none = self {
            return true
        }
        return false
    }
}

#if DEBUG
extension MessageDTO {
    init(
        id: String = UUID().uuidString,
        content: String,
        createdRaw: String? = nil,
        created: Date,
        action: Action,
        type: MessageType
    ) {
        self.id = id
        self.content = content
        self.createdRaw = createdRaw
        self.created = created
        self.action = action
        self.type = type
    }
}
#endif
