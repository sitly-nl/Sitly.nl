//
//  Font.swift
//  sitly
//
//  Created by Kyrylo Filippov on 22/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

enum FontKind: String {
    case openSans = "OpenSans"
}

extension Font {
    static var body2: Font { Font.custom(FontKind.openSans.rawValue, size: 16) }
    static var body3: Font { Font.custom(FontKind.openSans.rawValue, size: 14) }
    static var body4: Font { Font.custom(FontKind.openSans.rawValue, size: 12) }
    static var header4: Font { Font.custom(FontKind.openSans.rawValue, size: 18).weight(.bold) }
    static var header5: Font { Font.custom(FontKind.openSans.rawValue, size: 16).weight(.bold) }
    static var header6: Font { Font.custom(FontKind.openSans.rawValue, size: 14).weight(.bold) }

    // In new design we use body2 font but other screens using size 17,
    // so to be consistent with other screens temporary keep current size
    static var navigationBarFont: Font { Font.custom(FontKind.openSans.rawValue, size: 17) }
}
