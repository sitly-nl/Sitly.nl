//
//  DebugScreensViewModelFactory.swift
//  sitly
//
//  Created by Kyrylo Filippov on 27/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Combine

#if DEBUG || UAT
protocol DebugScreensViewModelFactoryProtocol {
    func createGeneralDebugScreenViewModel() -> BaseDebugScreenViewModel
    func createInvitesDebugScreenViewModell() -> BaseDebugScreenViewModel
    func createNetworkingDebugScreenViewModel() -> BaseDebugScreenViewModel
    func createAccountsEditorViewModel() -> AccountsEditorViewModel
    func createScreensDebugViewModel() -> ScreensDebugViewModel
    func createConversationsViewModel() -> ConversationsViewModel
    func createMessagesViewModel(user: UserDTO) -> MessagesViewModel
    func createMessagesDebugViewModel() -> MessagesDebugScreenViewModel
    func loadRandomUsersFromSearch(completion: @escaping ([UserDTO]) -> Void)
}

class DebugScreensViewModelFactory: BaseFactory, DebugScreensViewModelFactoryProtocol {
    func createGeneralDebugScreenViewModel() -> BaseDebugScreenViewModel {
        return GeneralDebugScreenViewModel(
            screensVmFactory: resolver.resolve(DebugScreensViewModelFactoryProtocol.self),
            userSettingsService: resolver.resolve(UserSettingsServiceable.self)
        )
    }

    func createInvitesDebugScreenViewModell() -> BaseDebugScreenViewModel {
        return InvitesDebugScreenViewModel(userSettingsService: resolver.resolve(UserSettingsServiceable.self))
    }

    func createNetworkingDebugScreenViewModel() -> BaseDebugScreenViewModel {
        return NetworkingDebugScreenViewModel(userSettingsService: resolver.resolve(UserSettingsServiceable.self))
    }

    func createAccountsEditorViewModel() -> AccountsEditorViewModel {
        return AccountsEditorViewModel(keychainService: resolver.resolve(KeychainManagable.self))
    }

    func createScreensDebugViewModel() -> ScreensDebugViewModel {
        return ScreensDebugViewModel(screensFactory: resolver.resolve(DebugScreensViewModelFactoryProtocol.self))
    }

    func createMessagesDebugViewModel() -> MessagesDebugScreenViewModel {
        return MessagesDebugScreenViewModel(
            screensFactory: resolver.resolve(DebugScreensViewModelFactoryProtocol.self),
            messagesService: resolver.resolve(MessagesWebServicesProtocol.self)
        )
    }

    func createConversationsViewModel() -> ConversationsViewModel {
        return ConversationsViewModel(
            messagesService: resolver.resolve(MessagesWebServicesProtocol.self),
            appBadgeService: resolver.resolve(AppBadgeServiceable.self),
            currentUserProvider: resolver.resolve(CurrentUserProvidable.self),
            tabBarCoordinator: resolver.resolve(TabBarCoordinatorProtocol.self),
            messagesFactory: resolver.resolve(MessagesFactoryProtocol.self),
            updateService: resolver.resolve(UpdatesProviderProtocol.self),
            profileFactory: resolver.resolve(PublicProfileViewModelFactoryProtocol.self)
        )
    }

    func createMessagesViewModel(user: UserDTO) -> MessagesViewModel {
        return MessagesViewModel(
            conversationDTO: nil,
            chatPartner: user,
            messagesService: resolver.resolve(MessagesWebServicesProtocol.self),
            currentUserProvider: resolver.resolve(CurrentUserProvidable.self),
            profileFactory: resolver.resolve(PublicProfileViewModelFactoryProtocol.self),
            userService: resolver.resolve(UserPersistenceServiceable.self),
            errosReporter: resolver.resolve(ErrorsReporterServiceable.self),
            unreadMessagesPublisher: Empty().eraseToAnyPublisher(),
            shouldHideProfileView: false
        )
    }

    func loadRandomUsersFromSearch(completion: @escaping ([UserDTO]) -> Void) {
        let searchService = resolver.resolve(SearchServiceable.self)
        let searchFrom = searchService.getRestoredSearchForm()
        searchFrom.limit = 29
        searchService.search(searchForm: searchFrom) { result in
            guard case .success(let searchResult) = result,
                  case .users(let users) = searchResult.entities else {
                completion([])
                return
            }
            completion(users.map({ UserDTO(user: $0) }))
        }
    }
}
#endif
