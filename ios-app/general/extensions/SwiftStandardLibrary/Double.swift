//
//  Double.swift
//  sitly
//
//  Created by Kyrylo Filippov on 2/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

extension Double {
    var asDistanceString: String {
        let formatter = NumberFormatter()
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = 1
        guard let formattedString = formatter.string(from: NSNumber(value: self)) else {
            return "\(self)"
        }
        return formattedString
    }
}
