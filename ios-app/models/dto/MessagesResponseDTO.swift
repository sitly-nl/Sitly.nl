//
//  MessagesResponseDTO.swift
//  sitly
//
//  Created by Kyrylo Filippov on 24/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

struct MessagesResponseDTO {
    let messages: [MessageDTO]
    let askRecommendation: Bool
    let askDisableSafetyMessages: Bool
    let safetyTips: String
    let rateLimitExceeded: Bool
    let rateLimitWarning: RateLimitWarning?
}
