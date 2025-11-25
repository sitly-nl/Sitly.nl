//
//  InvitesDebugScreenViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 27/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG || UAT
class InvitesDebugScreenViewModel: BaseDebugScreenViewModel {
    private let userSettingsService: UserSettingsServiceable

    init(userSettingsService: UserSettingsServiceable) {
        self.userSettingsService = userSettingsService
    }

    override var title: String { "Invites 📨" }

    override func setup() {
        super.setup()
        items.append(DebugSection(title: "", items: [
            resetInfoNote(),
            resetNextSteps(),
            resetSittesOnboardingTooltip(),
            resetParentsOnboardingTooltip(),
            forcePresentSurvey()
        ]))
    }

    private func resetInfoNote() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "🔄",
            title: "Reset Info Note presentation",
            subtitle: "Tap to show again"
        )
        return .trigger(tapVm: tapVm) { [weak tapVm, weak self] in
            self?.userSettingsService.shouldShowInviteInfoNote = true
            tapVm?.setSubtitle(text: "Info Note will be presented again! Restart the app.")
        }
    }

    private func resetNextSteps() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "🔄",
            title: "Reset Next Steps presentation",
            subtitle: "Tap to show again"
        )
        return .trigger(tapVm: tapVm) { [weak tapVm, weak self] in
            self?.userSettingsService.shouldShowInviteNextSteps = true
            tapVm?.setSubtitle(text: "Next Steps will be presented again after sending invite!")
        }
    }

    private func resetSittesOnboardingTooltip() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "🔄",
            title: "Reset sitters onboarding tooltip",
            subtitle: "Tap to show again"
        )
        return .trigger(tapVm: tapVm) { [weak tapVm, weak self] in
            self?.userSettingsService.shouldShowInviteSitterOnboardingTooltip = true
            tapVm?.setSubtitle(text: "Onboarding tooltip will be presented again!")
        }
    }

    private func resetParentsOnboardingTooltip() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "🔄",
            title: "Reset parents onboarding tooltip",
            subtitle: "Tap to show again"
        )
        return .trigger(tapVm: tapVm) { [weak tapVm, weak self] in
            self?.userSettingsService.shouldShowInviteParentOnboardingTooltip = true
            tapVm?.setSubtitle(text: "Onboarding tooltip will be presented again!")
        }
    }

    private func forcePresentSurvey() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "📝",
            title: "Force present Invites survey",
            subtitle: "Tap to show invites survey"
        )
        return .trigger(tapVm: tapVm) { [weak tapVm, weak self] in
            self?.userSettingsService.inviteSurveyDidVisitedTab = true
            self?.userSettingsService.inviteSurveyTriggerStartDate = Date()
            tapVm?.setSubtitle(text: "Please open Invites tab to see the survey.")
        }
    }
}
#endif
