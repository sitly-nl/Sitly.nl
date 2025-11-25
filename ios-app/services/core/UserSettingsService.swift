//
//  UserSettingsService.swift
//  sitly
//
//  Created by Kyrylo Filippov on 22/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

protocol UserSettingsServiceable: AnyObject {
    var shouldShowInviteInfoNote: Bool { get set }
    var shouldShowInviteNextSteps: Bool { get set }
    var inviteSurveyTriggerStartDate: Date? { get set }
    var inviteSurveyCountTrigger: Int { get set }
    var inviteSurveyDidVisitedTab: Bool { get set }
    var shouldShowInviteSitterOnboardingTooltip: Bool { get set }
    var shouldShowInviteParentOnboardingTooltip: Bool { get set }
#if DEBUG || UAT
    var environment: NetworkEnvironment { get set }
    var requestDelay: Double { get set }
    var debugPromtKind: PromptType? { get set }
#endif
}

class UserSettingsService: UserSettingsServiceable {
    var shouldShowInviteInfoNote: Bool {
        get { return UserDefaults.shouldShowInviteInfoNote }
        set { UserDefaults.shouldShowInviteInfoNote = newValue }
    }

    var shouldShowInviteNextSteps: Bool {
        get { return UserDefaults.shouldShowInviteNextSteps }
        set { UserDefaults.shouldShowInviteNextSteps = newValue }
    }

    var inviteSurveyTriggerStartDate: Date? {
        get { return UserDefaults.inviteSurveyTriggerStartDate }
        set { UserDefaults.inviteSurveyTriggerStartDate = newValue }
    }

    var inviteSurveyCountTrigger: Int {
        get { return UserDefaults.inviteSurveyCountTrigger }
        set { UserDefaults.inviteSurveyCountTrigger = newValue }
    }

    var inviteSurveyDidVisitedTab: Bool {
        get { return UserDefaults.inviteSurveyDidVisitedTab }
        set { UserDefaults.inviteSurveyDidVisitedTab = newValue }
    }

    var shouldShowInviteSitterOnboardingTooltip: Bool {
        get { return UserDefaults.shouldShowInviteSitterOnboardingTooltip }
        set { UserDefaults.shouldShowInviteSitterOnboardingTooltip = newValue }
    }

    var shouldShowInviteParentOnboardingTooltip: Bool {
        get { return UserDefaults.shouldShowInviteParentOnboardingTooltip }
        set { UserDefaults.shouldShowInviteParentOnboardingTooltip = newValue }
    }
#if DEBUG || UAT
    var environment: NetworkEnvironment {
        get { return NetworkEnvironment(rawValue: UserDefaults.environment) ?? .uat }
        set { UserDefaults.environment = newValue.rawValue }
    }
    var requestDelay: Double {
        get { return UserDefaults.requestDelay }
        set { UserDefaults.requestDelay = newValue }
    }
    var debugPromtKind: PromptType? {
        get {
            guard let kind = PromptType(rawValue: UserDefaults.debugPromtKind) else {
                return nil
            }
            return kind
        }
        set { UserDefaults.debugPromtKind = newValue?.rawValue ?? "" }
    }
#endif
}
