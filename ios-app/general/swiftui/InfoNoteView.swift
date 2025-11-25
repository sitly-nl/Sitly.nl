//
//  InfoNoteView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 22/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct InfoNoteView: View {
    let text: String
    let onClose: VoidClosure

    var body: some View {
        HStack(alignment: .center, spacing: .spS) {
            Image(.help).renderingMode(.template).foregroundColor(.neutral700)
                .frame(width: 24, height: 24)
                .padding(.leading, .spS)
            Text(text)
                .font(.body4)
                .foregroundColor(.neutral900)
                .frame(maxWidth: .infinity, alignment: .topLeading)
                .padding(.vertical, .spS)
            VStack { Color.shadesWhite }
                .frame(width: 20)
                .overlay(alignment: .top) {
                    Image(.cross).renderingMode(.template).foregroundColor(.neutral700)
                        .frame(width: 20, height: 20)
                        .onTapGesture { onClose() }
                }.padding([.trailing, .top], .spS)
        }
        .fixedSize(horizontal: false, vertical: true)
        .background(.shadesWhite)
        .cornerRadius(.spM)
        .padding(.spL)
    }
}
