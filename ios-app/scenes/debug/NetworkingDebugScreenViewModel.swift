//
//  NetworkingDebugScreenViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 26/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG || UAT
class NetworkingDebugScreenViewModel: BaseDebugScreenViewModel {
    private let userSettingsService: UserSettingsServiceable

    init(userSettingsService: UserSettingsServiceable) {
        self.userSettingsService = userSettingsService
    }

    override var title: String { "Networking 📡" }

    override func setup() {
        super.setup()
        items.append(DebugSection(title: "", items: [
            selectEnvironment(),
            requestDelay(),
            simulatePrompt()
        ]))
    }

    private func selectEnvironment() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "📡",
            title: "Select environment",
            subtitle: "Env: \(Server.baseURL)"
        )
        return .trigger(tapVm: tapVm) { [weak tapVm] in
            let next: NetworkEnvironment
            switch self.userSettingsService.environment {
            case .local: next = .dev
            case .dev: next = .uat
            case .uat: next = .prod
            case .prod: next = .local
            }

            self.userSettingsService.environment = next
            tapVm?.setSubtitle(text: "New Env: \(Server.baseURL)")
        }
    }

    private func requestDelay() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "🐌",
            title: "Request delay",
            subtitle: "Emulate slow internet connection, delay \(userSettingsService.requestDelay)s."
        )
        return .trigger(tapVm: tapVm) { [weak tapVm] in
            let next: Double
            switch self.userSettingsService.requestDelay {
            case 0.0: next = 0.25
            case 0.25: next = 0.5
            case 0.5: next = 1
            case 1: next = 1.5
            case 1.5: next = 2
            case 2: next = 3
            default:
                next = 0.0
            }
            self.userSettingsService.requestDelay = next
            tapVm?.setSubtitle(text: "Emulate slow internet connection, delay \(next)s.")
        }
    }

    private func simulatePrompt() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "🪧",
            title: "Simulate received Promt",
            subtitle: "Kind: \(userSettingsService.debugPromtKind?.rawValue ?? "not defined")"
        )
        return .trigger(tapVm: tapVm) { [weak tapVm] in
            let next: PromptType?
            switch self.userSettingsService.debugPromtKind {
            case .avatarReminder:
                next = .availabilityReminder
            case .availabilityReminder:
                next = .noAvailabilityReminder
            case .noAvailabilityReminder:
                next = .negativeReview
            case .negativeReview:
                next = .positiveReview
            case .positiveReview:
                next = .firstRecommendation
            case .firstRecommendation:
                next = .newApplication
            case .newApplication:
                next = .avatarOverlay
            case .avatarOverlay:
                next = nil
            case nil:
                next = .avatarReminder
            }

            self.userSettingsService.debugPromtKind = next
            tapVm?.setSubtitle(text: "Kind: \(self.userSettingsService.debugPromtKind?.rawValue ?? "not defined")")
        }
    }
}
#endif
