//
//  ConversationsView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct ConversationsView: View {
    @EnvironmentObject private var viewModel: ConversationsViewModel

    var body: some View {
        ZStack {
            ZStack(alignment: .top) {
                Color.neutral100
                VStack(spacing: 0.0) {
                    MessagesNavigationBar()
                    if viewModel.conversations != nil {
                        MessagesRootContentView()
                    }
                }
                if viewModel.isLoading {
                    ActivityIndicatorView()
                        .alignCenterVertically()
                }
            }
            .navigationBarHidden(true)
            .colorStatusBar()
        }
        .ignoresSafeArea(edges: .bottom)
        .onAppear {
            viewModel.onAppear()
        }
        .overlayPromtListener($viewModel.promtOverlay, isFullscreen: true)
        .navigationListener($viewModel.navigationKind)
    }
}

private struct MessagesNavigationBar: View {
    @EnvironmentObject private var viewModel: ConversationsViewModel

    var body: some View {
        NavigationBarView(
            title: viewModel.screenTitle,
            leftButtons: {
                if viewModel.conversations?.isEmpty == false {
                    Button(action: { viewModel.onEdit() }, label: {
                        Text(viewModel.editTitle)
                            .sitlyFont(.body3)
                            .foregroundColor(.white)
                    })
                }
            },
            rightButtons: {
                if viewModel.editingItems?.isEmpty == false {
                    Button(action: { viewModel.onBatchDelete() }, label: {
                        Text(viewModel.deleteTitle)
                            .sitlyFont(.heading6)
                            .foregroundColor(.white)
                    })
                }
            },
            customTitle: { EmptyView() }
        )
    }
}

private struct MessagesRootContentView: View {
    @EnvironmentObject private var viewModel: ConversationsViewModel

    var body: some View {
        ZStack {
            Spacer()
            if viewModel.conversations?.isEmpty ?? true {
                BasicEmptyStateView(
                    emptyStateText: viewModel.emptyStateText,
                    btnConfig: viewModel.searchBtnConfig
                )
            } else if let items = viewModel.conversations {
                ForEach(items) { conversation in
                    ConversationCardView(
                        dto: conversation,
                        editingItems: $viewModel.editingItems,
                        onSwipe: { viewModel.onSwipeAction(conversation: conversation) },
                        onDelete: { viewModel.delete(conversations: [conversation]) }
                    )
                    .padding(.bottom, .divider)
                    .onTapGesture {
                        viewModel.didSelect(conversation: conversation)
                    }
                }
                .makeList()
            }
            Spacer()
        }
    }
}

private struct ConversationCardView: View {
    @ObservedObject var dto: ConversationDTO
    @Binding var editingItems: [String]?
    let onSwipe: VoidClosure
    let onDelete: VoidClosure
    @State var inEditMode = false
    private let editActionWidth: CGFloat = 48.0

    var body: some View {
        ZStack(alignment: .leading) {
            Color.shadesWhite
            HStack(spacing: 0.0) {
                if inEditMode {
                    ZStack {
                        Color.white
                        Image(editingItems?.contains(dto.id) == true ? .checkSelected : .checkUnselected)
                    }
                    .frame(width: editActionWidth)
                }
                AsyncCachedImage(
                    url: dto.chatPartner.avatarURL,
                    placeholderImage: dto.chatPartner.placeholderImage
                ) { image in
                    image
                }
                .frame(width: 70, height: 70)
                .clipShape(Circle())
                ConversationInfoView(dto: dto)
                Spacer()
                ConversationDateView(dto: dto)
            }
            .padding(.spL)
        }
        .animateOpacity()
        .ignoresSafeArea()
        .addSwipeAction(
            dto.swipeActionKind,
            swipeActionState: $dto.swipeActionState,
            onActionPresented: onSwipe,
            action: onDelete
        )
        .onChange(of: editingItems) { newValue in
            withAnimation {
                inEditMode = newValue != nil
            }
        }
    }
}

private struct ConversationInfoView: View {
    @ObservedObject var dto: ConversationDTO

    var body: some View {
        VStack(spacing: 0) {
            Text(dto.chatPartnerName)
                .sitlyFont(.heading5)
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
            Text(dto.lastMessageConfig.text)
                .sitlyFont(dto.lastMessageConfig.font)
                .lineLimit(1)
                .foregroundColor(dto.lastMessageConfig.color)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.leading, .spL)
    }
}

private struct ConversationDateView: View {
    @ObservedObject var dto: ConversationDTO

    var body: some View {
        VStack(spacing: .spS) {
            Text(dto.messageDate)
                .sitlyFont(.body4)
                .foregroundColor(dto.unreadMessagesCount > 0 ? .primary500 : .neutral600)
            if dto.unreadMessagesCount > 0 {
                BadgeView(value: "\(dto.unreadMessagesCount)")
            }
        }
        .padding([.leading], .spM)
    }
}

#if DEBUG
#Preview {
    ConversationsView()
        .environmentObject(
            ConversationsViewModel(
                messagesService: MessagesWebServicesMock(
                    useMock: true, // false will switch to empty state
                    conversations: [
                        ConversationDTO(
                            unreadMessagesCount: 1,
                            chatPartner: UserDTO(
                                isParent: true,
                                avatarURL: URL(string: "https://rb.gy/n2ff59"),
                                firstName: "Asuka"
                            ),
                            lastMessage: MessageDTO(
                                content: "Hi, lets meet again!",
                                created: Date(),
                                action: .received,
                                type: .regular
                            )
                        ),
                        ConversationDTO(
                            unreadMessagesCount: 0,
                            chatPartner: UserDTO(
                                isParent: false,
                                avatarURL: nil,
                                firstName: "Anna"
                            ),
                            lastMessage: MessageDTO(
                                content: "Hola!",
                                created: Date().addingTimeInterval(-60*60*24),
                                action: .sent,
                                type: .regular
                            )
                        ),
                        ConversationDTO(
                            unreadMessagesCount: 0,
                            chatPartner: UserDTO(
                                isParent: true,
                                avatarURL: nil,
                                firstName: "Rosalia"
                            ),
                            lastMessage: MessageDTO(
                                content: "Please call me back! It is a long message, so opent the chat!",
                                created: Date().addingTimeInterval(-60*60*24*2),
                                action: .received,
                                type: .regular
                            )
                        ),
                        ConversationDTO(
                            unreadMessagesCount: 0,
                            chatPartner: UserDTO(
                                isParent: true,
                                avatarURL: nil,
                                firstName: "Dana"
                            ),
                            lastMessage: nil
                        )
                    ]),
                appBadgeService: AppBadgeServiceMock(),
                currentUserProvider: CurrentUserProviderMock(),
                tabBarCoordinator: TabBarCoordinator(),
                messagesFactory: MessagesFactoryMock(),
                updateService: UpdatesServiceMock(),
                profileFactory: PublicProfileViewModelFactoryMock()
            )
        )
}
#endif
