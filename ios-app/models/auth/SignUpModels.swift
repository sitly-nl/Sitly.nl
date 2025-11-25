//
//  SignUpModels.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/4/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

class SignUpModel {
    enum SignUpType {
        case regular(password: String)
        case facebook(token: String)
        case appleToken(token: String)
        case googleToken(token: String)

        var isGoogle: Bool {
            if case .googleToken = self {
                return true
            }
            return false
        }
    }

    var user = User()
    var countryCode = ""
    var type = SignUpType.regular(password: "")
    var userInput: (email: String?, password: String?)?
}

struct SignUpResponseModel {
    let user: User
    let token: String
}
