//
//  PublicProfileViewModelFactoryMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 11/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG
class PublicProfileViewModelFactoryMock: PublicProfileViewModelFactoryProtocol {
    func createPublicProfileViewModel(user: User) -> PublicProfileViewModel {
        PublicProfileViewModel(
            user: user,
            currentUserProvider: CurrentUserProviderMock(),
            invitesService: InvitesServiceMock(),
            userService: UserDetailsServiceMock(),
            userSettings: UserSettingsMock(),
            remoteUserProvider: RemoteUserProviderMock(),
            configService: ConfigServiceMock(),
            surveyService: SurveyServiceMock(),
            messagesFactory: MessagesFactoryMock()
        )
    }
}
#endif
