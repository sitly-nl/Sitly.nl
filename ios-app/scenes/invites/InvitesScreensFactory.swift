//
//  InvitesScreensFactory.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

typealias VoidClosure = () -> Void

protocol InvitesScreensFactoryProtocol {
    func createInvitesRootView() -> UIViewController?
}

class InvitesScreensFactory: BaseFactory, InvitesScreensFactoryProtocol {
    func createInvitesRootView() -> UIViewController? {
        let configService = resolver.resolve(ConfigServiceable.self)
        guard case .available = configService.fetch()?.invitesFeatureStatus else {
            return nil
        }
        let viewModel = resolver.resolve(InvitesRootViewModel.self)
        let rootInvitesView = InvitesRootView().environmentObject(viewModel)

        let hostingVC = CustomUIHostingController(rootView: rootInvitesView)
        hostingVC.tabBarItem.image = .invitesMenu.withRenderingMode(.alwaysOriginal)
        hostingVC.tabBarItem.selectedImage = .invitesMenuSelected.withRenderingMode(.alwaysOriginal)
        hostingVC.tabBarItem.title = viewModel.tabTitle
        hostingVC.tabBarItem.badgeColor = UIColor.primary500
        return hostingVC
    }
}
