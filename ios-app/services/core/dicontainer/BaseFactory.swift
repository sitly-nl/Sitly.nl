//
//  BaseFactory.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

class BaseFactory {
    let resolver: DIResolverType

    required init(resolver: DIResolverType) {
        self.resolver = resolver
    }
}
