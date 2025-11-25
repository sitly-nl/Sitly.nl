//
//  Logger.swift
//  sitly
//
//  Created by Kyrylo Filippov on 23/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import UIKit

// Very primitive first implementation to have already entry point for logging
class Logger {
    static func log(
        _ message: String,
        file: String = #file,
        function: String = #function
    ) {
        guard !UIApplication.isProduction else {
            return
        }
        // For now we are interested in those messages only in Debug / UAT builds
        // Prefix helps to filter out other messages in the console
        print("[sitly] \(message)")
    }
}
