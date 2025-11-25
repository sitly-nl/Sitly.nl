//
//  ActionSheetModifier.swift
//  sitly
//
//  Created by Kyrylo Filippov on 8/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct ActionSheetModifier: ViewModifier {
    let cancelTitle: String
    @Binding var actions: [ActionSheetAction]
    @State var isPresented: Bool = false

    func body(content: Content) -> some View {
        content
            .onChange(of: actions) { newActions in
                let shouldPresent = !newActions.isEmpty
                if shouldPresent {
                    content.hideKeyboard()
                }
                isPresented = shouldPresent
            }
            .confirmationDialog("", isPresented: $isPresented, titleVisibility: .hidden) {
                ForEach(actions) { action in
                    Button {
                        action.action()
                        actions = []
                    } label: {
                        Text(action.title)
                            .sitlyFont(.body2)
                            .foregroundColor(.neutral900)
                    }
                }
                Button(role: .cancel) {
                    actions = []
                } label: {
                    Text(cancelTitle)
                        .sitlyFont(.heading5)
                        .foregroundColor(.neutral900)
                }
            }
    }
}

extension View {
    func actionSheetPresenter(cancelTitle: String, actions: Binding<[ActionSheetAction]>) -> some View {
        modifier(ActionSheetModifier(cancelTitle: cancelTitle, actions: actions))
    }
}
