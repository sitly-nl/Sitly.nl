//
//  View.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

extension View {
    func colorStatusBar(_ color: Color = .brandPrimary) -> some View {
        self.overlay(alignment: .top) {
            color
                .ignoresSafeArea(edges: .top)
                .frame(height: 0)
        }
    }

    func colorBottomSafeArea(_ color: Color = .shadesWhite) -> some View {
        self.overlay(alignment: .bottom) {
            color
                .ignoresSafeArea(edges: .bottom)
                .frame(height: 0)
        }
    }

    func alignLeading() -> some View {
        HStack(spacing: 0.0) {
            self
            Spacer()
        }
    }

    func alignTrailing() -> some View {
        HStack(spacing: 0.0) {
            Spacer()
            self
        }
    }

    func alignCenter() -> some View {
        HStack(spacing: 0.0) {
            Spacer()
            self
            Spacer()
        }
    }

    func alignCenterVertically() -> some View {
        VStack(spacing: 0.0) {
            Spacer()
            self
            Spacer()
        }
    }

    @ViewBuilder
    func align(position: HorizontalAlignment) -> some View {
        switch position {
        case .leading:
            alignLeading()
        case .trailing:
            alignTrailing()
        default:
            alignCenter()
        }
    }

    func makeList() -> some View {
        ScrollView {
            LazyVStack(spacing: 0.0) {
                self
            }
        }
    }

    func border(_ color: Color, width: CGFloat, cornerRadius: CGFloat) -> some View {
        overlay(RoundedRectangle(cornerRadius: cornerRadius).stroke(color, lineWidth: width))
    }

    func wrapInZStack(color: Color) -> some View {
        ZStack {
            color
            Spacer()
            self
            Spacer()
        }
        .ignoresSafeArea()
    }

    func wrapInZStack<V: Equatable>(animatedValue: V) -> some View {
        ZStack {
            self
        }
        .animation(.easeInOut, value: animatedValue)
    }

    func embedIn(view: UIView) {
        let controller = UIHostingController(rootView: self)
        controller.view.translatesAutoresizingMaskIntoConstraints = false
        controller.view.backgroundColor = .clear
        view.addSubview(controller.view)

        if #unavailable(iOS 16) {
            // Required only for iOS 15.x
            let window = UIApplication.shared.keyWindow
            let inverseSafeAreaInset = window?.safeAreaInsets.bottom ?? 0
            controller.additionalSafeAreaInsets = UIEdgeInsets(top: 0, left: 0, bottom: -inverseSafeAreaInset, right: 0)
        }

        NSLayoutConstraint.activate([
            controller.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            controller.view.topAnchor.constraint(equalTo: view.topAnchor),
            controller.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            controller.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    @inlinable func reverseMask<Mask: View>(
        alignment: Alignment = .center,
        @ViewBuilder _ mask: () -> Mask
    ) -> some View {
        self.mask(
            ZStack {
                Rectangle()
                mask().blendMode(.destinationOut)
            }
        )
    }

    func disableAnimation() -> some View {
        self.transaction { transaction in
            transaction.animation = nil
        }
    }

    func hideKeyboard() {
        UIApplication.shared.keyWindow?.endEditing(true)
    }
}

extension View {
    @ViewBuilder
    func buildNavDestinationView(_ navDestination: NavigationKind) -> some View {
        switch navDestination {
        case .userProfile(let viewModel):
            PublicProfileSUIView().environmentObject(viewModel)
        case .messages(let viewModel):
            MessagesView().environmentObject(viewModel)
        default:
            EmptyView()
        }
    }
}
