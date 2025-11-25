//
//  InvitesFeatureStatus.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

enum InvitesFeatureStatus {
    case notAvailable
    case available(dailyLimit: Int)

    init(dailyLimit: Int?) {
        guard let actualDailyLimit = dailyLimit else {
            self = .notAvailable
            return
        }
        self = .available(dailyLimit: actualDailyLimit)
    }

    var isInvitesAvailable: Bool {
        if case .available = self {
            return true
        }
        return false
    }

    var invitesLimit: Int {
        if case .available(let count) = self {
            return count
        }
        return 0
    }
}
