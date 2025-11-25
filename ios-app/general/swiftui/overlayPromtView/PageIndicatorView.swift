//
//  PageIndicatorView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 19/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct PageIndicatorView: View {
    let pagesCount: Int
    @Binding var selectedIndex: Int

    var body: some View {
        HStack(spacing: .spS) {
            ForEach(0...pagesCount - 1, id: \.self) { index in
                Circle()
                    .frame(width: .spS, height: .spS)
                    .foregroundColor(selectedIndex == index ? .neutral900 : .neutral300)
            }
        }
    }
}
