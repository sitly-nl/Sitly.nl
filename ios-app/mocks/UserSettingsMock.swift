//
//  UserSettingsMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 23/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG
class UserSettingsMock: UserSettingsServiceable {
    var inviteSurveyTriggerStartDate: Date?
    var inviteSurveyDidVisitedTab: Bool = false
    var debugPromtKind: PromptType?
    var shouldShowInviteSitterOnboardingTooltip = true
    var shouldShowInviteParentOnboardingTooltip = true
    var shouldShowInviteNextSteps = true
    var shouldShowInviteInfoNote = true
    var environment: NetworkEnvironment = .uat
    var requestDelay: Double = 0.0
    var inviteSurveyCountTrigger = 0

    init(shouldShowInviteInfoNote: Bool = true) {
        self.shouldShowInviteInfoNote = shouldShowInviteInfoNote
    }
}
#endif
