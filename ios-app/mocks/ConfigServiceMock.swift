//
//  ConfigServiceMock.swift
//  sitly
//
//  Created by Kyrylo Filippov on 12/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG
class ConfigServiceMock: ConfigServiceable {
    func getConfig(completion: @escaping ServerRequestCompletion<Configuration>) {
    }

    func fetch() -> Configuration? {
        return nil
    }

    var forceHidePremium: Bool {
        return false
    }
}
#endif
