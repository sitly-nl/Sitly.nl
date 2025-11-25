//
//  MessagesWebServicesMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG
class MessagesWebServicesMock: MessagesWebServicesProtocol {
    let conversations: [ConversationDTO]
    let conversationMessages: [MessageDTO]
    let useMock: Bool
    let unreadMessagesCount: Int
    var rateLimitExceeded = false
    var rateLimitWarning: RateLimitWarning?
    var wasAutoRejectCalled = false
    var wasDeleteConversationCalled = false
    var shouldFailAutoreject = false
    var shouldFailDeletingConversation = false
    var wasGetConversationsCalled = false

    init(
        useMock: Bool,
        conversations: [ConversationDTO] = [],
        conversationMessages: [MessageDTO] = [],
        unreadMessagesCount: Int = 0
    ) {
        self.useMock = useMock
        self.unreadMessagesCount = unreadMessagesCount
        self.conversationMessages = conversationMessages
        self.conversations = conversations
    }

    func getConversations(completion: @escaping ServerRequestCompletion<ConversationsResponseDTO>) {
        wasGetConversationsCalled = true
        completion(.success(
            ConversationsResponseDTO(
                conversations: useMock ? conversations : [],
                unreadMessagesCount: unreadMessagesCount,
                autoRejectableUsers: [],
                noRepliesReceived: false))
        )
    }

    func markConversationAsRead(
        id: String,
        lastReadMessageId: String,
        completion: @escaping ServerRequestCompletion<JsonApiObject>
    ) {
        completion(.failure(.server))
    }

    func deleteConversation(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        wasDeleteConversationCalled = true
        if shouldFailDeletingConversation {
            completion(.failure(.server))
        } else {
            completion(.success(JsonApiObject([String: Any]())))
        }
    }

    func getMessagesForConversation(id: String, completion: @escaping ServerRequestCompletion<MessagesResponseDTO>) {
        if useMock {
            completion(.success(
                MessagesResponseDTO(
                    messages: conversationMessages,
                    askRecommendation: false,
                    askDisableSafetyMessages: false,
                    safetyTips: "",
                    rateLimitExceeded: rateLimitExceeded,
                    rateLimitWarning: rateLimitWarning
                )
            ))
        } else {
            completion(.failure(.server))
        }
    }

    func sendMessage(content: String, userId: String, completion: @escaping ServerRequestCompletion<MessageDTO>) {
        if useMock {
            completion(.success(MessageDTO(content: content, created: Date(), action: .sent, type: .regular)))
        } else {
            completion(.failure(.server))
        }
    }

    func autoRejectOld(userIds: [String], completion: @escaping ServerRequestCompletion<[Message]>) {
        completion(.failure(.server))
    }

    func autoReject(userIds: [String], completion: @escaping ServerRequestCompletion<[MessageDTO]>) {
        wasAutoRejectCalled = true
        if shouldFailAutoreject {
            completion(.failure(.server))
        } else {
            completion(.success([]))
        }
    }
}
#endif
