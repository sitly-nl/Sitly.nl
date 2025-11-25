//
//  ScreensFactory.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

class ScreensFactory {
    private static var resolver: DIResolverType?

    static var invites: InvitesScreensFactoryProtocol? = resolver?.resolve(InvitesScreensFactoryProtocol.self)
    static var conversations: ConversationsScreensFactoryProtocol? =
    resolver?.resolve(ConversationsScreensFactoryProtocol.self)
#if DEBUG || UAT
    static var debug: DebugScreensFactoryProtocol? = resolver?.resolve(DebugScreensFactoryProtocol.self)
#endif

    static func setResolver(resolver: DIResolverType?) {
        self.resolver = resolver
    }
}
