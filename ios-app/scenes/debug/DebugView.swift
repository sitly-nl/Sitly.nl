//
//  DebugView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 27/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

#if DEBUG || UAT
struct DebugView: View {
    @EnvironmentObject var viewModel: BaseDebugScreenViewModel
    @State private var navDestination: DebugItem = .none
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
                                viewModel.onClose()
                                dismiss()
                            }
                    },
                    rightButtons: { EmptyView() },
                    customTitle: { EmptyView() }
                )
                List(viewModel.items) { section in
                    DebugSectionView(section: section)
                }
                .listStyle(.plain)
            }
            NavigationLink(
                destination: buildNavDestinationView(),
                tag: navDestination,
                selection: $viewModel.navDestination,
                label: { EmptyView() }
            )
        }
        .ignoresSafeArea(edges: .bottom)
        .navigationBarHidden(true)
        .colorStatusBar()
        .onChange(of: viewModel.navDestination) { newValue in
            guard let newNavDestination = newValue else {
                navDestination = .none
                return
            }
            navDestination = newNavDestination
        }
    }

    @ViewBuilder
    private func buildNavDestinationView() -> some View {
        switch navDestination {
        case .navigation(_, let screenVm):
            if let debugVm = screenVm() {
                DebugView().environmentObject(debugVm)
            }
        case .accountsEditor(_, let screenVm):
            if let editorVm = screenVm() {
                AccountsEditorView().environmentObject(editorVm)
            }
        case .conversations(_, let screenVm):
            if let conversationVm = screenVm() {
                ConversationsView().environmentObject(conversationVm)
            }
        case .messages(_, let screenVm):
            if let messagesVm = screenVm() {
                MessagesView().environmentObject(messagesVm)
            }
        case .trigger, .none:
            EmptyView()
        }
    }
}

private struct DebugSectionView: View {
    @EnvironmentObject var viewModel: BaseDebugScreenViewModel
    let section: DebugSection

    var body: some View {
        VStack(alignment: .leading) {
            if !section.title.isEmpty {
                Text(section.title)
                    .fontWeight(.semibold)
                    .padding(.top, .spXS)
                Color.neutral900.frame(height: 1)
            }
            ForEach(section.items) { item in
                DebugItemView(itemVm: item.tapVm, isNavigation: item.isNavigation)
                    .onTapGesture {
                        viewModel.didSelect(item: item)
                    }
            }
        }
        .listRowBackground(Color.neutral100)
        .listRowSeparatorTint(.clear)
    }
}

private struct DebugItemView: View {
    @StateObject var itemVm: DebugTappableViewModel
    let isNavigation: Bool

    var body: some View {
        ZStack(alignment: .top) {
            Color.neutral100
            VStack {
                Spacer()
                HStack {
                    Text(itemVm.image)
                    VStack(alignment: .leading) {
                        Text(itemVm.title)
                            .font(.body2)
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                        if !itemVm.subtitle.isEmpty {
                            Text(itemVm.subtitle)
                                .font(.body4)
                                .lineLimit(2)
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    Spacer()
                    if isNavigation {
                        Spacer()
                        Image(systemName: "arrow.right")
                    }
                }
                Spacer()
                Color.neutral500.frame(height: 1)
            }
        }
    }
}
#endif

#if DEBUG
#Preview {
    DebugView().environmentObject(BaseDebugScreenViewModel())
}
#endif
