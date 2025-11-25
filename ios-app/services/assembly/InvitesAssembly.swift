//
//  InvitesAssembly.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

// In case that assembly will include a lot of services it will mean we need to extract
// invite functionality into a separate module.
class InvitesAssembly: AssemblyType {
    func assemble(container: DIContainerType) {
        container.registerFactory(InvitesScreensFactoryProtocol.self, InvitesScreensFactory.self)
        container.register(type: InvitesRootViewModel.self) { r in
            InvitesRootViewModel(
                currentUserProvider: r.resolve(CurrentUserProvidable.self),
                userSettings: r.resolve(UserSettingsServiceable.self),
                invitesService: r.resolve(InvitesServiceable.self),
                favoritesService: r.resolve(FavoriteServiceable.self),
                userService: r.resolve(UserPersistenceServiceable.self),
                configService: r.resolve(ConfigServiceable.self),
                updateService: r.resolve(UpdatesProviderProtocol.self),
                profileFactory: r.resolve(PublicProfileViewModelFactoryProtocol.self),
                tabBarCoordinator: r.resolve(TabBarCoordinatorProtocol.self),
                appBadgeService: r.resolve(AppBadgeServiceable.self),
                surveyService: r.resolve(SurveyServiceable.self)
            )
        }
        container.registerSingleton(type: InvitesServiceable.self) { r in
            InvitesService(userService: r.resolve(UserPersistenceServiceable.self))
        }
    }
}
