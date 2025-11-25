//
//  MessagesFactoryMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 23/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Combine

#if DEBUG
class MessagesFactoryMock: MessagesFactoryProtocol {
    func createMessagesViewModel(
        conversationDTO: ConversationDTO,
        unreadMessagesPublisher: AnyPublisher<[String: Int], Never>,
        shouldHideProfileView: Bool
    ) -> MessagesViewModel {
        let dto = UserDTO(isParent: true)
        return MessagesViewModel(
            conversationDTO: ConversationDTO(
                unreadMessagesCount: 0,
                chatPartner: dto,
                lastMessage: nil
            ),
            chatPartner: dto,
            messagesService: MessagesWebServicesMock(useMock: false, conversations: []),
            currentUserProvider: CurrentUserProviderMock(),
            profileFactory: PublicProfileViewModelFactoryMock(),
            userService: UserPersistenceServiceMock(),
            errosReporter: ErrorsReporterServiceMock(),
            unreadMessagesPublisher: unreadMessagesPublisher,
            shouldHideProfileView: shouldHideProfileView
        )
    }
}
#endif
