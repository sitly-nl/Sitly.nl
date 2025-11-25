//
//  URL.swift
//  sitly
//
//  Created by Kyrylo Filippov on 27/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

extension URL {
    func firstQueryItem(_ name: QueryItemName) -> String? {
        let queryItems = URLComponents(string: self.absoluteString)?.queryItems ?? []
        return queryItems.first { $0.name == name.rawValue }?.value
    }
}
