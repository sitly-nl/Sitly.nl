//
//  OverlayPromtView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 19/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct OverlayPromtView: View {
    @EnvironmentObject private var viewModel: OverlayPromtViewModel

    var body: some View {
        VStack(spacing: 0.0) {
            HStack {
                Spacer()
                Image(.cross).renderingMode(.template).foregroundColor(.neutral700)
                    .frame(width: 16, height: 16)
                    .padding([.top, .trailing], .spXL)
                    .onTapGesture {
                        viewModel.onClose?()
                    }
            }
            .padding(.bottom, .spS)
            if viewModel.pageStyle == .pageStyle {
                OverlayPromtPageView()
            } else {
                DialogPromtPageView()
            }
        }
        .background(
            .shadesWhite,
            in: RoundedRectangle(
                cornerRadius: .spL,
                style: .continuous
            )
        )
        .padding([.leading, .trailing], .spS)
        .wrapInZStack(color: .opacityDark)
    }
}

private struct OverlayPromtPageView: View {
    @EnvironmentObject private var viewModel: OverlayPromtViewModel

    var body: some View {
        if let selectedPage = viewModel.selectedPage {
            VStack(spacing: 0.0) {
                VStack(spacing: 0.0) {
                    Image(uiImage: selectedPage.image)
                        .resizable()
                        .scaledToFit()
                        .frame(height: 150)
                    Text(selectedPage.title)
                        .font(.header4)
                        .foregroundColor(.neutral900)
                        .padding([.top, .bottom], .spM)
                    Text(selectedPage.text)
                        .font(.body3)
                        .foregroundColor(.neutral700)
                        .multilineTextAlignment(.center)
                        .padding(.bottom, .sp2XL)
                }
                .compositingGroup()
                .id(selectedPage.image)
                .padding([.leading, .trailing], .sp4XL)
                .transition(AnyTransition.asymmetric(
                    insertion: .move(edge: .trailing),
                    removal: .move(edge: .leading)
                ))
                .animation(.easeOut, value: viewModel.selectedIndex)
                VStack(spacing: 0.0) {
                    PageIndicatorView(pagesCount: viewModel.pages.count, selectedIndex: $viewModel.selectedIndex)
                    ButtonView(config: viewModel.nextButtonConfig)
                        .padding(.top, .sp2XL)
                    Text(viewModel.skipButtonTitle)
                        .font(.body3)
                        .foregroundColor(.neutral900)
                        .underline()
                        .padding(.top, .spM)
                        .onTapGesture {
                            viewModel.onClose?()
                        }
                }
                .padding([.leading, .trailing, .bottom], .sp4XL)
            }
        }
    }
}

private struct DialogPromtPageView: View {
    @EnvironmentObject private var viewModel: OverlayPromtViewModel

    var body: some View {
        VStack(spacing: 0.0) {
            VStack(spacing: 0.0) {
                Text(viewModel.title)
                    .font(.header4)
                    .foregroundColor(.neutral900)
                    .multilineTextAlignment(.center)
                    .padding(.bottom, .spM)
                Text(viewModel.text)
                    .font(.body3)
                    .foregroundColor(.neutral700)
                    .multilineTextAlignment(.center)
                    .padding(.bottom, .sp2XL)
                VStack(spacing: 0.0) {
                    ForEach(viewModel.actions) { config in
                        ButtonView(config: config)
                            .padding(.bottom, .spM)
                    }
                }
                .padding(.bottom, .sp3XL)
            }
            .compositingGroup()
            .padding([.leading, .trailing], .sp4XL)
        }
    }
}

#if DEBUG
private let previewVM = OverlayPromtViewModel(
    title: "Hi, title is here!",
    text: "Some info text about issue",
    pageStyle: .pageStyle,
    pages: [
        PromtPageInfo(
            image: .inviteSittersPromt1,
            title: "Profile shared success",
            text: "Some Profile shared success with a description which can go in 2 lines"
        ),
        PromtPageInfo(
            image: .inviteSittersPromt2,
            title: "Introduce yourself!",
            text: "Some Introduce yourself text with a description which can go in 2 lines"
        ),
        PromtPageInfo(
            image: .inviteSittersPromt3,
            title: "Keep it up!",
            text: "Some Keep it up! text with a description which can go in 2 lines"
        )
    ],
    actions: [
        ButtonConfig(title: "Get Premium", style: .primary, action: nil),
        ButtonConfig(title: "Try again tomorrow", style: .secondary, action: nil)
    ],
    onClose: nil
)
#Preview {
    OverlayPromtView().environmentObject(previewVM)
}
#endif
