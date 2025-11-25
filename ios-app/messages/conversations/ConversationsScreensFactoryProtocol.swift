//
//  ConversationsScreensFactoryProtocol.swift
//  sitly
//
//  Created by Kyrylo Filippov on 3/7/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

protocol ConversationsScreensFactoryProtocol {
    func createConversationsRootView(action: RemoteActivityType?) -> UIViewController?
}

class ConversationsScreensFactory: BaseFactory, ConversationsScreensFactoryProtocol {
    func createConversationsRootView(action: RemoteActivityType?) -> UIViewController? {
        let viewModel = resolver.resolve(ConversationsViewModel.self)
        viewModel.setRemote(action: action)
        let rootView = ConversationsView().environmentObject(viewModel)

        let hostingVC = CustomUIHostingController(rootView: rootView)
        hostingVC.tabBarItem.image = .messagesMenu.withRenderingMode(.alwaysOriginal)
        hostingVC.tabBarItem.selectedImage = .messagesMenuSelected.withRenderingMode(.alwaysOriginal)
        hostingVC.tabBarItem.title = viewModel.screenTitle
        hostingVC.tabBarItem.badgeColor = UIColor.primary500
        return hostingVC
    }
}
