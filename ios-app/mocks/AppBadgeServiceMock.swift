//
//  AppBadgeServiceMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 2/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG
class AppBadgeServiceMock: AppBadgeServiceable {
    var invitesCount = 0
    var messagesCount = 0

    func updateInvites(count: Int) {
        invitesCount = count
    }

    func updateMessages(count: Int) {
        messagesCount = count
    }
}
#endif
