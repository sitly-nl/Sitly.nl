//
//  BasicEmptyStateView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct BasicEmptyStateView: View {
    let emptyStateText: String
    let btnConfig: ButtonConfig

    var body: some View {
        VStack {
            Spacer()
            Text(emptyStateText)
                .sitlyFont(.body3)
                .padding(.bottom, .spXL)
                .foregroundColor(.neutral900)
            ButtonView(config: btnConfig)
                .padding([.leading, .trailing], .spL)
            Spacer()
        }
    }
}
