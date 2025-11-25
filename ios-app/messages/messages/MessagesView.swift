//
//  MessagesView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 23/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI
import Combine
import IQKeyboardManagerSwift

struct MessagesView: View {
    @EnvironmentObject private var viewModel: MessagesViewModel

    var body: some View {
        ZStack {
            Color.neutral100
                .onTapGesture {
                    hideKeyboard()
                }
            VStack(spacing: 0.0) {
                MessagesNavBar()
                MessagesListView()
                MessagesEmptyStateView()
                NotAvailableUserView()
                MessagesView.MessagesRateLimitView()
                MessageInputView()
            }
        }
        .colorStatusBar(.shadesWhite)
        .colorBottomSafeArea(viewModel.messages == nil ? .neutral100 : .shadesWhite)
        .actionSheetPresenter(cancelTitle: viewModel.cancelMenuTitle, actions: $viewModel.actionSheetActions)
        .navigationListener($viewModel.navigationKind)
        .onAppear {
            viewModel.onAppear()
            // messup with swiftui keyboard avoidance
            IQKeyboardManager.shared.enable = false
        }
        .onDisappear {
            IQKeyboardManager.shared.enable = true
        }
        .navigationBarHidden(true)
        .overlay {
            ReportUserView()
        }
        .overlayPromtListener($viewModel.promtOverlay)
    }
}

private struct ReportUserView: View {
    @EnvironmentObject private var viewModel: MessagesViewModel

    var body: some View {
        if let user = viewModel.showReportUser {
            ReportUserSUIView(user: user) {
                withAnimation {
                    viewModel.hideReportUser()
                }
            }
            .background(ClearBackgroundView())
            .animateOpacity()
            .onAppear {
                IQKeyboardManager.shared.enable = true
            }
            .onDisappear {
                IQKeyboardManager.shared.enable = false
            }
            .ignoresSafeArea()
        }
    }
}

struct ClearBackgroundView: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        return InnerView()
    }

    func updateUIView(_ uiView: UIView, context: Context) {
    }

    private class InnerView: UIView {
        override func didMoveToWindow() {
            super.didMoveToWindow()
            superview?.superview?.backgroundColor = .clear
        }
    }
}

private struct NotAvailableUserView: View {
    @EnvironmentObject private var viewModel: MessagesViewModel
    private let bottomInset: CGFloat = UIApplication.shared.keyWindow?.safeAreaInsets.bottom ?? 0.0

    var body: some View {
        if let config = viewModel.notAvailableUserConfig {
            HStack(spacing: 0.0) {
                VStack(alignment: .leading, spacing: 0.0) {
                    Text(config.title)
                        .sitlyFont(.heading6)
                        .foregroundColor(.primary500)
                    Text(config.text)
                        .sitlyFont(.body3)
                        .foregroundColor(.neutral700)
                        .padding(.bottom, bottomInset)
                }
                .padding(.spL)
            }
            .frame(maxWidth: .infinity)
            .background {
                Color.shadesWhite
            }
            .animateOpacity()
        }
    }
}

private struct MessagesEmptyStateView: View {
    @EnvironmentObject private var viewModel: MessagesViewModel

    var body: some View {
        if let emptyStateConfig = viewModel.emptyStateConfig,
           viewModel.notAvailableUserConfig == nil {
            HStack(spacing: 0.0) {
                VStack(spacing: 0.0) {
                    Text(emptyStateConfig.title)
                        .sitlyFont(.heading6)
                        .foregroundColor(.neutral700)
                        .padding(.bottom, emptyStateConfig.button == nil ? .spXL : .spL)
                        .multilineTextAlignment(.center)
                        .frame(width: 234)
                    if let btnConfig = emptyStateConfig.button {
                        ButtonView(config: btnConfig)
                            .padding(.bottom, .sp4XL)
                            .disableAnimation()
                    }
                }
            }
            .frame(maxWidth: .infinity)
            .background {
                Color.neutral100
                    .onTapGesture {
                        hideKeyboard()
                    }
            }
            .compositingGroup()
            .animateOpacity()
        }
    }
}

private struct MessagesListView: View {
    @EnvironmentObject private var viewModel: MessagesViewModel
    @State private var keyboardHeight: CGFloat = 0
    @State var wasScrolled = false

    var body: some View {
        if viewModel.rateLimitWarning == nil {
            ZStack {
                Color.neutral100
                VStack(spacing: 0.0) {
                    if let messages = viewModel.messages?.enumerated().map({ $0 }) {
                        ScrollViewReader { reader in
                            ForEach(messages, id: \.element.id) { index, messageKind in
                                VStack(spacing: 0) {
                                    switch messageKind {
                                    case .date(let title):
                                        Text(title)
                                            .sitlyFont(.body4)
                                            .foregroundColor(.neutral600)
                                            .frame(maxWidth: .infinity)
                                            .padding(.top, index == 0 ? .sp2XL : 0.0)
                                            .padding(.bottom, .spM)
                                            .id(title)
                                            .animateOpacity()
                                    case .message(let dto):
                                        MessageItemView(
                                            viewModel: MessageItemViewModel(viewModel.chatPartner, dto),
                                            onAppear: viewModel.onMessageAppears,
                                            onDissapears: viewModel.onMessageDissapears
                                        )
                                        .padding(.bottom, .spM)
                                        .id(dto.id)
                                    }
                                }
                            }
                            .makeList()
                            .onReceive(viewModel.$scrollConfig) { config in
                                guard let config else { return }
                                scroll(to: config.id, scrollReader: reader, animated: wasScrolled && config.animated)
                                wasScrolled = true
                            }
                        }
                    } else {
                        ActivityIndicatorView()
                            .alignCenterVertically()
                    }
                }
            }
            .keyboardHeight($keyboardHeight)
            .onChange(of: keyboardHeight) { _ in
                viewModel.onKeyboardUpdate()
            }
            .onTapGesture {
                hideKeyboard()
            }
        } else {
            Spacer()
        }
    }

    private func scroll(to id: String, scrollReader: ScrollViewProxy, animated: Bool) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
            if animated {
                withAnimation {
                    scrollReader.scrollTo(id, anchor: .bottom)
                }
            } else {
                scrollReader.scrollTo(id, anchor: .bottom)
            }
        }
    }
}

private struct MessageItemView: View {
    let viewModel: MessageItemViewModel
    let onAppear: (MessageDTO) -> Void
    let onDissapears: (MessageDTO) -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 0.0) {
            if viewModel.isReceived {
                AsyncCachedImage(
                    url: viewModel.avatarURL,
                    placeholderImage: viewModel.placeholderImage
                ) { image in
                    image
                }
                .frame(width: 24, height: 24)
                .clipShape(Circle())
                .padding([.top, .trailing], .spS)
            } else {
                Spacer()
            }
            VStack(spacing: 0.0) {
                VStack(alignment: .leading, spacing: 0.0) {
                    if viewModel.isReceived {
                        Text(viewModel.title)
                            .sitlyFont(.heading6)
                            .foregroundColor(.neutral700)
                            .padding(.bottom, .spXS)
                    }
                    Text(viewModel.content)
                        .sitlyFont(.body2)
                        .foregroundColor(.neutral900)
                        .padding(.bottom, .spXS)
                    Text(viewModel.time)
                        .sitlyFont(.body4)
                        .opacity(0.0)
                }
                .padding(.spM)
                .overlay(alignment: .bottomTrailing) {
                    Text(viewModel.time)
                        .sitlyFont(.body4)
                        .foregroundColor(.neutral600)
                        .padding([.trailing, .bottom], .spM)
                }
            }
            .background(viewModel.isReceived ? .shadesWhite : .neutral200)
            .cornerRadius(.spS)
            .overlay(
                RoundedRectangle(cornerRadius: .spS)
                    .stroke(viewModel.isReceived ? .neutral200 : .neutral300, lineWidth: 1)
            )
            if viewModel.isReceived {
                Spacer()
            }
        }
        .padding(.trailing, viewModel.isReceived ? .sp3XL : .spL)
        .padding(.leading, viewModel.isReceived ? .spL : .sp3XL)
        .animateOpacity()
        .onAppear {
            onAppear(viewModel.message)
        }
        .onDisappear {
            onDissapears(viewModel.message)
        }
    }
}

private struct MessageInputView: View {
    @EnvironmentObject private var viewModel: MessagesViewModel
    @FocusState private var isFocused: Bool

    var body: some View {
        if viewModel.canSendMessages {
            VStack(spacing: 0.0) {
                Color.neutral100.frame(height: 1.0)
                HStack(alignment: .bottom, spacing: 0) {
                    ZStack {
                        MessagesView.MultiEntryTextEditor(
                            text: viewModel.isSendingMessage ? .constant(viewModel.inputString) : $viewModel.inputString,
                            isDisabled: viewModel.isSendingMessage
                        )
                        .multilineTextAlignment(.leading)
                        .focused($isFocused)
                        if !isFocused && viewModel.inputString.isEmpty {
                            Text(viewModel.messagePlaceholder)
                                .sitlyFont(.body2)
                                .foregroundColor(.neutral900)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .allowsHitTesting(false)
                        }
                    }
                    .padding(.trailing, .spS)
                    ZStack {
                        Button(action: {
                            viewModel.sendMessage()
                        }, label: {
                            if viewModel.isSendingMessage {
                                ActivityIndicatorView(image: .loaderPrimary)
                            } else {
                                Image(.send)
                                    .renderingMode(.template)
                                    .foregroundColor(.shadesWhite)
                            }
                        })
                        .frame(width: 40, height: 40)
                        .background(
                            .primary500,
                            in: RoundedRectangle(
                                cornerRadius: .spM,
                                style: .continuous
                            )
                        )
                        if !viewModel.isSendButtonEnabled && !viewModel.isSendingMessage {
                            Color.shadesWhite.opacity(0.5)
                                .frame(width: 40, height: 40)
                        }
                    }
                }
                .padding(.spM)
                .background(Color.white)
                .overlay(alignment: .topTrailing) {
                    MessagesView.ScrollDownView()
                }
            }
            .animateOpacity()
        }
    }
}

private struct MessagesNavBar: View {
    @EnvironmentObject private var viewModel: MessagesViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0.0) {
            NavigationBarView(
                backgroundColor: .shadesWhite) {
                    Image(.arrowBack)
                        .renderingMode(.template)
                        .foregroundColor(.neutral900)
                        .onTapGesture {
                            dismiss()
                        }
                        .overlay(alignment: .leading) {
                            if viewModel.unreadMessageCount > 0 {
                                BadgeView(value: "\(viewModel.unreadMessageCount)")
                                    .padding(.leading, .spL)
                                    .animateOpacity()
                            }
                        }
                } rightButtons: {
                    Image(.optionsBtn)
                        .renderingMode(.template)
                        .foregroundColor(.neutral900)
                        .onTapGesture {
                            viewModel.didSelectMenu()
                        }
                } customTitle: {
                    HStack(alignment: .center, spacing: 0) {
                        AsyncCachedImage(
                            url: viewModel.chatPartner.avatarURL,
                            placeholderImage: viewModel.chatPartner.placeholderImage
                        ) { image in
                            image
                        }
                        .frame(width: 36, height: 36)
                        .clipShape(Circle())
                        VStack(alignment: .center, spacing: 0) {
                            Text(viewModel.chatPartnerName)
                                .sitlyFont(.heading6)
                                .foregroundColor(.neutral900)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            Text(viewModel.lastSeenText)
                                .sitlyFont(.body5)
                                .foregroundColor(.neutral900)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(.leading, .spS)
                    }
                    .padding(.leading, .sp5XL)
                }
            Color.neutral100.frame(height: 1.0)
        }
    }
}

#if DEBUG
#Preview {
    MessagesView()
        .environmentObject(
            MessagesViewModel(
                conversationDTO: ConversationDTO(
                    unreadMessagesCount: 0,
                    chatPartner: UserDTO(
                        isParent: true,
                        avatarURL: URL(string: "https://rb.gy/n2ff59"),
                        firstName: "Asuka"
                    ),
                    lastMessage: nil
                ),
                chatPartner: UserDTO(
                    isParent: true,
                    avatarURL: URL(string: "https://rb.gy/n2ff59"),
                    firstName: "Asuka"
                ),
                messagesService: MessagesWebServicesMock(
                    useMock: true,
                    conversationMessages: [
                        MessageDTO(
                            content: "Hi Asuka, how it is going?",
                            created: Date(),
                            action: .received,
                            type: .regular
                        ),
                        MessageDTO(
                            content: "Hope to see you soon!",
                            created: Date(),
                            action: .received,
                            type: .regular
                        ),
                        MessageDTO(
                            content: "It is a bit longer message, so lets see hot it will be presented on UI!?",
                            created: Date(),
                            action: .received,
                            type: .regular
                        ),
                        MessageDTO(
                            content: "Leave me alone !!!",
                            created: Date(),
                            action: .sent,
                            type: .regular
                        ),
                        MessageDTO(
                            content: "🤯",
                            created: Date(),
                            action: .received,
                            type: .regular
                        )
                    ]
                ),
                currentUserProvider: CurrentUserProviderMock(),
                profileFactory: PublicProfileViewModelFactoryMock(),
                userService: UserPersistenceServiceMock(),
                errosReporter: ErrorsReporterServiceMock(),
                unreadMessagesPublisher: Empty().eraseToAnyPublisher(),
                shouldHideProfileView: false
            )
        )
}
#endif
