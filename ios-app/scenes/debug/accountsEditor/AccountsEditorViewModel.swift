//
//  AccountsEditorViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 18/4/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

#if DEBUG || UAT
class AccountsEditorViewModel: ObservableObject {
    // MARK: - Dependencies

    private let keychainService: KeychainManagable

    // MARK: - State

    @Published var accounts = [StoredAccount]()

    // MARK: - Public properties

    var title: String { "Accounts (\(environment.uppercased()))" }

    // MARK: - Private properties

    private var environment = ""

    // MARK: - Lifecycle

    init(keychainService: KeychainManagable) {
        self.keychainService = keychainService
    }

    // MARK: - Actions

    func onAppear() {
        environment = UserDefaults.environment
        accounts = keychainService.storedAccounts()
    }

    func deleteItem(index: Int) {
        guard let login = accounts[safe: index]?.login else { return }
        keychainService.removeStoredAccount(login: login)
    }
}
#endif
