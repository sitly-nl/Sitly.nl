import Foundation

struct AutoRejectableUser {
    let userId: String
    let firstName: String
}

enum RateLimitWarning: String {
    case lastHour = "last_hour"
    case lastDay = "last_day"
    case lastWeek = "last_week"
    case lastMonth = "last_month"
}

struct MessagesResponse {
    let messages: [Message]
    let askRecommendation: Bool
    let jobPosting: JobPosting?
    let askDisableSafetyMessages: Bool
    let safetyTips: String
    let rateLimitExceeded: Bool
    let rateLimitWarning: RateLimitWarning?
}

protocol MessagesWebServicesProtocol {
    func getConversations(completion: @escaping ServerRequestCompletion<ConversationsResponseDTO>)
    func markConversationAsRead(id: String, lastReadMessageId: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func deleteConversation(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>)
    func getMessagesForConversation(id: String, completion: @escaping ServerRequestCompletion<MessagesResponseDTO>)
    func sendMessage(content: String, userId: String, completion: @escaping ServerRequestCompletion<MessageDTO>)
    func autoReject(userIds: [String], completion: @escaping ServerRequestCompletion<[MessageDTO]>)
}

extension ServerManager: MessagesWebServicesProtocol {
// MARK: - Conversations
    func getConversations(completion: @escaping ServerRequestCompletion<ConversationsResponseDTO>) {
        ServerConnection(
            endpoint: "conversations",
            queryDictionary: ["include": "chat-partner"],
            resultOnMainThread: false
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                let autoRejectableUsers = (try? jsonObj.meta?.valueForKey("autoRejectableUsers")) ?? [[String: Any]]()
                completion(.success(ConversationsResponseDTO(
                    conversations: jsonObj.multiple(),
                    unreadMessagesCount: jsonObj.meta.flatMap { try? $0.valueForKey("totalUnreadMessagesCount") } ?? 0,
                    autoRejectableUsers: autoRejectableUsers.compactMap { try? AutoRejectableUser(
                        userId: $0.valueForKey("userId"),
                        firstName: $0.valueForKey("firstName")
                    ) },
                    noRepliesReceived: jsonObj.meta.flatMap { try? $0.valueForKey("noRepliesReceived") } ?? false
                )))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func markConversationAsRead(id: String, lastReadMessageId: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "conversations/\(id)/messages",
            httpMethod: .POST,
            body: ["lastReadMessageId": lastReadMessageId]
        ).execute(completion: completion)
    }

    func deleteConversation(id: String, completion: @escaping ServerRequestCompletion<JsonApiObject>) {
        ServerConnection(
            endpoint: "conversations/\(id)",
            httpMethod: .DELETE
        ).execute(completion: completion)
    }

// MARK: - Messages
    func getMessagesForConversation(id: String, completion: @escaping ServerRequestCompletion<MessagesResponseDTO>) {
        ServerConnection(
            endpoint: "conversations/\(id)/messages",
            headers: ["x-timezone-offset": "-\(TimeZone.current.secondsFromGMT()/60)"],
            resultOnMainThread: false
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                completion(.success(MessagesResponseDTO(
                    messages: jsonObj.multiple(),
                    askRecommendation: jsonObj.meta.flatMap({ try? $0.valueForKey("askForRecommendation") }) ?? false,
                    askDisableSafetyMessages: jsonObj.meta.flatMap({ try? $0.valueForKey("askDisableSafetyMessages") }) ?? false,
                    safetyTips: jsonObj.meta.flatMap({ try? $0.valueForKey("safetyTips") }) ?? "",
                    rateLimitExceeded: jsonObj.meta.flatMap({ try? $0.valueForKey("rateLimitExceeded") }) ?? false,
                    rateLimitWarning: jsonObj.meta.flatMap({ try? RateLimitWarning(rawValue: $0.valueForKey("rateLimitWarning")) })
                )))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func sendMessage(content: String, userId: String, completion: @escaping ServerRequestCompletion<MessageDTO>) {
        ServerConnection(
            endpoint: "conversations/\(userId)/messages",
            httpMethod: .POST,
            body: ["content": content],
            resultOnMainThread: false
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                if let message: MessageDTO = jsonObj.single() {
                    completion(.success(message))
                } else {
                    completion(.failure(.dataParsing(.general)))
                }
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    func autoReject(userIds: [String], completion: @escaping ServerRequestCompletion<[MessageDTO]>) {
        ServerConnection(
            endpoint: "conversations/autorejection",
            httpMethod: .POST,
            body: ["userIds": userIds],
            resultOnMainThread: false
        ).execute {
            switch $0 {
            case .success(let jsonObj):
                completion(.success(jsonObj.multiple()))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
}
