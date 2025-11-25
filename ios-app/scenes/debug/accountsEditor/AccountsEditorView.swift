//
//  AccountsEditorView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 18/4/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

#if DEBUG || UAT
struct AccountsEditorView: View {
    @EnvironmentObject var viewModel: AccountsEditorViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack(alignment: .top) {
            Color.neutral100
            VStack {
                NavigationBarView(
                    title: viewModel.title,
                    leftButtons: {
                        Image(.publicProfileBack)
                            .renderingMode(.template)
                            .foregroundColor(.shadesWhite)
                            .onTapGesture {
                                dismiss()
                            }
                    },
                    rightButtons: { EmptyView() },
                    customTitle: { EmptyView() }
                )
                List {
                    ForEach(viewModel.accounts) { account in
                        HStack {
                            Text(account.description)
                            Spacer()
                        }.frame(height: 50.0)
                    }
                    .onDelete(perform: delete)
                }
                .listStyle(.plain)
            }
        }
        .ignoresSafeArea(edges: .bottom)
        .navigationBarHidden(true)
        .colorStatusBar()
        .onAppear {
            viewModel.onAppear()
        }
    }

    func delete(at offsets: IndexSet) {
        guard let index = offsets.first else { return }
        viewModel.deleteItem(index: index)
    }
}
#endif
