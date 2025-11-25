//
//  CurrentUserProviderMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 23/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG

class CurrentUserProviderMock: CurrentUserProvidable {
    var currentUserDto: UserDTO?

    init(currentUserDto: UserDTO? = nil) {
        self.currentUserDto = currentUserDto
    }
}

#endif
