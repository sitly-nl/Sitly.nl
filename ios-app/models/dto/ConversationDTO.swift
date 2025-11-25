//
//  ConversationDTO.swift
//  sitly
//
//  Created by Kyrylo Filippov on 23/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

class ConversationDTO: JsonApiMappable, ObservableObject, Identifiable {
    // MARK: - Public Properties
    let id: String
    let chatPartner: UserDTO

    var chatPartnerName: String {
        let title = chatPartner.firstName
        if lastMessage?.type == .autoRejection {
            return "\(title) (\("chat.declined".localized))"
        }
        return title
    }

    var isInstantJob: Bool {
        return lastMessage?.type == .instantJob
    }

    let swipeActionKind: SwipeActionKind = .delete

    // MARK: - Private Properties

    private var lastMessage: MessageDTO?

    // MARK: - State

    @Published private(set) var lastMessageConfig = LastMessageConfig.empty
    @Published private(set) var unreadMessagesCount: Int
    @Published var swipeActionState: SwipeActionState = .hidden

    // MARK: - LifeCycle

    init(id: String, unreadMessagesCount: Int, chatPartner: UserDTO, lastMessage: MessageDTO?) {
        self.id = id
        self.unreadMessagesCount = unreadMessagesCount
        self.chatPartner = chatPartner
        self.lastMessage = lastMessage
        self.lastMessageConfig = getLastMessageConfig()
    }

    required convenience init(data: JsonData, includes: [[String: Any]]?) throws {
        let entityId = data.id

        guard let includes = includes, let relationships = data.relationships else {
            throw ParsingError.missingField("includes \(includes == nil), relationships \(data.relationships == nil)")
        }

        guard let user: User = JsonApi.parseSingularRelationship(
            relationships,
            includes: includes,
            key: "chatPartner"
        ) else {
            throw ParsingError.missingField("chatPartner")
        }

        let attributes = data.attributes
        let chatUser = UserDTO(user: user)
        let message: MessageDTO? = JsonApi.parseSingularRelationship(relationships, includes: includes, key: "lastMessage")
        let messagesCount = (try? attributes.valueForKey("unreadMessagesCount")) ?? 0
        self.init(
            id: entityId,
            unreadMessagesCount: messagesCount,
            chatPartner: chatUser,
            lastMessage: message
        )
    }

    // MARK: - Public API

    func update(newLastMessage: MessageDTO) {
        DispatchQueue.main.async { [weak self] in
            guard let strongSelf = self else {
                return
            }
            strongSelf.lastMessage = newLastMessage
            strongSelf.lastMessageConfig = strongSelf.getLastMessageConfig()
        }
    }

    func markAsRead() {
        DispatchQueue.main.async { [weak self] in
            guard let strongSelf = self, strongSelf.unreadMessagesCount > 0 else {
                return
            }
            strongSelf.unreadMessagesCount = 0
            strongSelf.lastMessageConfig = strongSelf.getLastMessageConfig()
        }
    }
}

extension ConversationDTO {
    func getLastMessageConfig() -> LastMessageConfig {
        guard let lastMessage else {
            return LastMessageConfig("messages.conversation.noMessages".localized, .body3, .neutral500)
        }
        var text = isInstantJob ? "(\("newParent".localized))" : lastMessage.content
        if lastMessage.action == .sent {
            text = "you".localized + " " + text
        }
        let fontKind: SitlyFontKind = unreadMessagesCount > 0 ? .heading6 : .body3
        let color: Color = unreadMessagesCount > 0 ? .neutral800 : .neutral900
        return LastMessageConfig(text, fontKind, color)
    }

    var messageDate: String {
        return lastMessage?.created.timeAgoNew ?? ""
    }
}

struct LastMessageConfig {
    let text: String
    let font: SitlyFontKind
    let color: Color

    init(_ text: String, _ font: SitlyFontKind, _ color: Color) {
        self.text = text
        self.font = font
        self.color = color
    }

    static let empty = LastMessageConfig("", .body3, .clear)
}

extension ConversationDTO {
    convenience init(unreadMessagesCount: Int, chatPartner: UserDTO, lastMessage: MessageDTO?) {
        self.init(
            id: UUID().uuidString,
            unreadMessagesCount: unreadMessagesCount,
            chatPartner: chatPartner,
            lastMessage: lastMessage
        )
    }
}
