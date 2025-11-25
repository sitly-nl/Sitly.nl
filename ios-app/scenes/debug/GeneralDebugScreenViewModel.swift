//
//  GeneralDebugScreenViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 27/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation
import Sentry
import UIKit

#if DEBUG || UAT
class GeneralDebugScreenViewModel: BaseDebugScreenViewModel {
    private let screensVmFactory: DebugScreensViewModelFactoryProtocol
    private let userSettingsService: UserSettingsServiceable

    init(
        screensVmFactory: DebugScreensViewModelFactoryProtocol,
        userSettingsService: UserSettingsServiceable
    ) {
        self.screensVmFactory = screensVmFactory
        self.userSettingsService = userSettingsService
    }

    override var title: String { "Debug menu 🐛" }
    private var debugScreenVm: BaseDebugScreenViewModel?
    private var accountsEditorVm: AccountsEditorViewModel?

    override func onClose() {
        super.onClose()
        debugScreenVm = nil
    }

    override func setup() {
        super.setup()
        items.append(
            DebugSection(title: "General", items: [
                navigateToNetworking(),
                navigateToInvites(),
                navigateToMessages(),
                navigateToAccountsEditor(),
                navigateToScreensInDevelopment()
            ]))
        items.append(
            DebugSection(title: "Device Info", items: [
                pushTokenInfo()
            ]))
        items.append(
            DebugSection(title: "App", items: [
                closeApp(),
                forceLogOut(),
                crashApp()
            ]))
    }

    private func navigateToNetworking() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "📡",
            title: "Networking settings",
            subtitle: ""
        ) { [weak self] in
            self?.debugScreenVm = self?.screensVmFactory.createNetworkingDebugScreenViewModel()
        }
        return .navigation(
            tapVm: tapVm,
            screenVm: { [weak self] in
                return self?.debugScreenVm
            }
        )
    }

    private func navigateToInvites() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "📨",
            title: "Invites settings",
            subtitle: ""
        ) { [weak self] in
            self?.debugScreenVm = self?.screensVmFactory.createInvitesDebugScreenViewModell()
        }
        return .navigation(
            tapVm: tapVm,
            screenVm: { [weak self] in
                return self?.debugScreenVm
            }
        )
    }

    private func navigateToMessages() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "💬",
            title: "Messages settings",
            subtitle: ""
        ) { [weak self] in
            self?.debugScreenVm = self?.screensVmFactory.createMessagesDebugViewModel()
        }
        return .navigation(
            tapVm: tapVm,
            screenVm: { [weak self] in
                return self?.debugScreenVm
            }
        )
    }

    private func navigateToAccountsEditor() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "🔐",
            title: "Stored accounts editor",
            subtitle: ""
        ) { [weak self] in
            self?.accountsEditorVm = self?.screensVmFactory.createAccountsEditorViewModel()
        }
        return .accountsEditor(
            tapVm: tapVm,
            screenVm: { [weak self] in
                return self?.accountsEditorVm
            }
        )
    }

    private func navigateToScreensInDevelopment() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "🛠️",
            title: "Screens in development 👷🏻‍♀️",
            subtitle: ""
        ) { [weak self] in
            self?.debugScreenVm = self?.screensVmFactory.createScreensDebugViewModel()
        }
        return .navigation(
            tapVm: tapVm,
            screenVm: { [weak self] in
                return self?.debugScreenVm
            }
        )
    }

    private func closeApp() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "📲",
            title: "Close app",
            subtitle: "Tap to force close the app"
        )
        return .trigger(tapVm: tapVm) { [weak self] in
            self?.exitTheApp()
        }
    }

    private func forceLogOut() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "🙅🏼‍♀️",
            title: "Force log out",
            subtitle: "Tap to force log out and return to onboarding"
        )
        return .trigger(tapVm: tapVm) {
            NotificationCenter.default.post(name: .userBecameUnauthorized, object: nil)
        }
    }

    private func crashApp() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "💥",
            title: "Crash app",
            subtitle: "Tap to crash the app for Sentry testing"
        )
        return .trigger(tapVm: tapVm) {
            let array = ["some value"]
            print(array[5])
        }
    }

    private func pushTokenInfo() -> DebugItem {
        let tapVm = DebugTappableViewModel(
            image: "🔔",
            title: "Push Token",
            subtitle: "Tap to copy push token to the Clipboard"
        )
        return .trigger(tapVm: tapVm) {
            let token = UserDefaults.fcmToken
            tapVm.setSubtitle(text: token.isEmpty ? "No token available" : "Token copied to the Clipboard!")
            UIPasteboard.general.string = token
        }
    }

    private func exitTheApp() {
        exit(0)
    }
}
#endif
