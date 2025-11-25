//
//  MessagesFactory.swift
//  sitly
//
//  Created by Kyrylo Filippov on 23/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Combine

protocol MessagesFactoryProtocol {
    func createMessagesViewModel(
        conversationDTO: ConversationDTO,
        unreadMessagesPublisher: AnyPublisher<[String: Int], Never>,
        shouldHideProfileView: Bool
    ) -> MessagesViewModel
}

class MessagesFactory: BaseFactory, MessagesFactoryProtocol {
    func createMessagesViewModel(
        conversationDTO: ConversationDTO,
        unreadMessagesPublisher: AnyPublisher<[String: Int], Never>,
        shouldHideProfileView: Bool
    ) -> MessagesViewModel {
        return MessagesViewModel(
            conversationDTO: conversationDTO,
            chatPartner: conversationDTO.chatPartner,
            messagesService: resolver.resolve(MessagesWebServicesProtocol.self),
            currentUserProvider: resolver.resolve(CurrentUserProvidable.self),
            profileFactory: resolver.resolve(PublicProfileViewModelFactoryProtocol.self),
            userService: resolver.resolve(UserPersistenceServiceable.self),
            errosReporter: resolver.resolve(ErrorsReporterServiceable.self),
            unreadMessagesPublisher: unreadMessagesPublisher,
            shouldHideProfileView: shouldHideProfileView
        )
    }
}
