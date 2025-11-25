//
//  SwipeActionsModifier.swift
//  sitly
//
//  Created by Kyrylo Filippov on 1/7/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct SwipeActionsModifier: ViewModifier {
    let swipeAction: SwipeActionKind?
    let swipeActionState: Binding<SwipeActionState>
    let onActionPresented: VoidClosure?
    let action: VoidClosure

    @State private var offset: CGFloat = 0
    private let swipeActionWidth: CGFloat = 74.0

    func body(content: Content) -> some View {
        if let swipeAction {
            ZStack(alignment: .trailing) {
                content
                    .offset(x: offset)
                SwipeActionButtonView(actionKind: swipeAction) {
                    action()
                }
                .offset(x: offset + swipeActionWidth)
            }
            .modifier(SwipeLeftActionModifier(
                swipeActionState: swipeActionState,
                offset: $offset,
                swipeActionWidth: swipeActionWidth,
                onActionPresented: onActionPresented
            ))
            .animation(.easeInOut, value: offset)
        } else {
            content
        }
    }
}

extension View {
    func addSwipeAction(
        _ actionKind: SwipeActionKind?,
        swipeActionState: Binding<SwipeActionState>,
        onActionPresented: VoidClosure?,
        action: @escaping VoidClosure
    ) -> some View {
        self.modifier(
            SwipeActionsModifier(
                swipeAction: actionKind,
                swipeActionState: swipeActionState,
                onActionPresented: onActionPresented,
                action: action
            )
        )
    }
}

private struct SwipeLeftActionModifier: ViewModifier {
    @State private var isSwipeActionPresented = false
    @Binding var swipeActionState: SwipeActionState
    @Binding var offset: CGFloat
    let swipeActionWidth: CGFloat
    let onActionPresented: VoidClosure?

    func body(content: Content) -> some View {
        content.gesture(
            DragGesture()
                .onChanged { value in
                    onDrag(width: value.translation.width)
                }
                .onEnded { value in
                    onDragEnded(width: value.translation.width)
                }
        )
        .onChange(of: swipeActionState) { value in
            guard isSwipeActionPresented && (value == .hidden || value == .disabled) else {
                return
            }
            isSwipeActionPresented = false
            withAnimation {
                offset = 0
            }
        }
    }

    private func onDrag(width: Double) {
        guard swipeActionState != .disabled else {
            return
        }
        let newPosition = min(max(-swipeActionWidth, width), 0)
        if newPosition > 0 {
            offset = 0
        } else {
            offset = newPosition
        }
    }

    private func onDragEnded(width: Double) {
        guard swipeActionState != .disabled else {
            return
        }
        let isSwipeLeft = width < 0
        if isSwipeLeft && isSwipeActionPresented || !isSwipeLeft && !isSwipeActionPresented {
            return
        }
        withAnimation {
            if isSwipeActionPresented {
                offset = 0
            } else {
                offset = -swipeActionWidth
                onActionPresented?()
            }
            isSwipeActionPresented.toggle()
            swipeActionState = isSwipeActionPresented ? .presented : .hidden
        }
    }
}

private struct SwipeActionButtonView: View {
    let hasAction: Bool
    let title: String
    let icon: UIImage?
    let backColor: Color
    let action: VoidClosure?

    init(actionKind: SwipeActionKind?, action: VoidClosure?) {
        hasAction = actionKind != nil
        title = actionKind?.title ?? ""
        icon = actionKind?.icon
        backColor = actionKind?.backColor ?? .neutral700
        self.action = action
    }

    var body: some View {
        if hasAction {
            ZStack {
                backColor
                VStack(spacing: .spS) {
                    if let icon {
                        Image(uiImage: icon)
                    }
                    Text(title)
                        .font(.body4)
                        .foregroundColor(.shadesWhite)
                }
            }
            .frame(width: 74)
            .onTapGesture {
                action?()
            }
        }
    }
}

enum SwipeActionKind {
    case addFavorite
    case removeFavorite
    case selected
    case hide
    case unhide
    case presentingSwipeAction
    case delete

    var title: String {
        switch self {
        case .hide:
            return "hide".localized
        case .delete:
            return "delete".localized
        default:
            return ""
        }
    }

    var backColor: Color {
        if case .delete = self {
            return .error400
        }
        return .neutral700
    }

    var icon: UIImage? {
        switch self {
        case .addFavorite:
            return .favoriteEmpty
        case .removeFavorite:
            return .favoriteFull
        case .selected, .presentingSwipeAction:
            return nil
        case .hide:
            return .eyeUnselected
        case .unhide:
            return .eyeSelected
        case .delete:
            return .crossWhiteSmall
        }
    }
}

enum SwipeActionState: Int, Equatable {
    case hidden
    case presented
    case disabled
}
