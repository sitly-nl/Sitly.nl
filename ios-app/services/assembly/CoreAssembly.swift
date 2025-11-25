//
//  CoreAssembly.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

protocol AssemblyType {
    func assemble(container: DIContainerType)
}

class CoreAssembly: AssemblyType {
    func assemble(container: DIContainerType) {
        assembleSingletones(container: container)
        assembleFactories(container: container)
        container.register(type: ConfigServiceable.self) { _ in
            ConfigService()
        }
        container.register(type: CurrentUserProvidable.self) { r in
            r.resolve(AuthServiceable.self)
        }
        container.register(type: UserSettingsServiceable.self) { _ in
            UserSettingsService()
        }
        container.register(type: FavoriteServiceable.self) { _ in
            FavoriteService()
        }
        container.register(type: UserPersistenceServiceable.self) { _ in
            UserService()
        }

        container.register(type: UpdatesProviderProtocol.self) { r in
            r.resolve(UpdatesServiceable.self)
        }
        container.register(type: UserDetailsServiceable.self) { _ in
            UserService()
        }
        container.register(type: RemoteUserProviderProtocol.self) { r in
            r.resolve(ServerApiManagerProtocol.self)
        }
        container.register(type: KeychainManagable.self) { _ in
            KeychainManager()
        }
        container.register(type: UserSettingsWebServicesProtocol.self) { _ in
            UserSettingsWebServices()
        }
        container.register(type: SearchServiceable.self) { _ in
            SearchService()
        }
        container.register(type: ConversationsViewModel.self) { r in
            ConversationsViewModel(
                messagesService: r.resolve(MessagesWebServicesProtocol.self),
                appBadgeService: r.resolve(AppBadgeServiceable.self),
                currentUserProvider: r.resolve(CurrentUserProvidable.self),
                tabBarCoordinator: r.resolve(TabBarCoordinatorProtocol.self),
                messagesFactory: r.resolve(MessagesFactoryProtocol.self),
                updateService: r.resolve(UpdatesProviderProtocol.self),
                profileFactory: r.resolve(PublicProfileViewModelFactoryProtocol.self)
            )
        }
        container.register(type: MessagesWebServicesProtocol.self) { r in
            r.resolve(ServerApiManagerProtocol.self)
        }
    }

    private func assembleSingletones(container: DIContainerType) {
        container.registerSingleton(type: AuthServiceable.self) { r in
            AuthService(
                errorsReporter: r.resolve(ErrorsReporterServiceable.self)
            )
        }
        container.registerSingleton(type: UpdatesServiceable.self) { _ in
            UpdatesService()
        }
        container.registerSingleton(type: ServerApiManagerProtocol.self) { _ in
            ServerManager()
        }
        container.registerSingleton(type: TabBarCoordinatorProtocol.self) { _ in
            TabBarCoordinator()
        }
        container.registerSingleton(type: ErrorsReporterServiceable.self) { _ in
            ErrorsReporterService()
        }
        container.registerSingleton(type: AppBadgeServiceable.self) { _ in
            AppBadgeService()
        }
        container.registerSingleton(type: SurveyServiceable.self) { r in
            SurveyService(
                userSettings: r.resolve(UserSettingsServiceable.self),
                currentUserProvider: r.resolve(CurrentUserProvidable.self)
            )
        }
        container.registerSingleton(type: SessionServiceable.self) { _ in
            Session()
        }
        container.registerSingleton(type: RemoteActivityHandlerProtocol.self) { _ in
            RemoteActivityHandler()
        }
    }

    private func assembleFactories(container: DIContainerType) {
        container.registerFactory(PublicProfileViewModelFactoryProtocol.self, PublicProfileViewModelFactory.self)
        container.registerFactory(MessagesFactoryProtocol.self, MessagesFactory.self)
        container.registerFactory(ConversationsScreensFactoryProtocol.self, ConversationsScreensFactory.self)
#if DEBUG || UAT
        container.registerFactory(DebugScreensViewModelFactoryProtocol.self, DebugScreensViewModelFactory.self)
        container.registerFactory(DebugScreensFactoryProtocol.self, DebugScreensFactory.self)
#endif
    }
}
