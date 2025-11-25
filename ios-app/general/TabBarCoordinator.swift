//
//  TabBarCoordinator.swift
//  sitly
//
//  Created by Kyrylo Filippov on 13/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation
import Combine

protocol TabBarCoordinatorProtocol {
    var onTabSelected: AnyPublisher<String, Never> { get }
    var onTabBarAction: AnyPublisher<TabBarActionKind, Never> { get }
    func selectedTab(name: String)
    func perform(action: TabBarActionKind)
}

class TabBarCoordinator: TabBarCoordinatorProtocol {
    var onTabSelected: AnyPublisher<String, Never> {
        onTabSelectedSubject.eraseToAnyPublisher()
    }

    var onTabBarAction: AnyPublisher<TabBarActionKind, Never> {
        onTabBarActionSubject.eraseToAnyPublisher()
    }

    private var onTabSelectedSubject = PassthroughSubject<String, Never>()
    private var onTabBarActionSubject = PassthroughSubject<TabBarActionKind, Never>()

    func selectedTab(name: String) {
        onTabSelectedSubject.send(name)
    }

    func perform(action: TabBarActionKind) {
        onTabBarActionSubject.send(action)
    }
}

enum TabKind: String {
    case search
    case messages
    case invites

    var vcName: String {
        switch self {
        case .search:
            return String(describing: SearchViewController.self)
        case .messages:
            return String(describing: ConversationsView.self)
        case .invites:
            return String(describing: InvitesRootView.self)
        }
    }
}
