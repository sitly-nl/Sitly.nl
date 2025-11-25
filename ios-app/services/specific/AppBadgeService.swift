//
//  AppBadgeService.swift
//  sitly
//
//  Created by Kyrylo Filippov on 2/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation
import UIKit

protocol AppBadgeServiceable {
    func updateInvites(count: Int)
    func updateMessages(count: Int)
}

class AppBadgeService: AppBadgeServiceable {
    private var invitesCount = 0
    private var messagesCount = 0

    func updateInvites(count: Int) {
        DispatchQueue.main.async {
            self.invitesCount = count
            self.updateAppBadge()
        }
    }

    func updateMessages(count: Int) {
        DispatchQueue.main.async {
            self.messagesCount = count
            self.updateAppBadge()
        }
    }

    private func updateAppBadge() {
        UIApplication.shared.applicationIconBadgeNumber = invitesCount + messagesCount
    }
}
