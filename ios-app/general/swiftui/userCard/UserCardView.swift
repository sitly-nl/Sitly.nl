//
//  UserCardView.swift
//  sitly
//
//  Created by Kyrylo Filippov on .spXS/3/2.spXS.
//  Copyright © 202.spXS Sitly. All rights reserved.
//

import SwiftUI

struct UserCardView: View {
    @EnvironmentObject private var viewModel: UserCardViewModel

    var body: some View {
        UserCardBodyView()
            .frame(height: viewModel.cardHeight)
            .cornerRadius(viewModel.hasBorders ? .spL : 0.0)
            .padding(.trailing, viewModel.hasBorders ? .spM : 0.0)
            .ignoresSafeArea()
            .addSwipeAction(
                viewModel.swipeAction,
                swipeActionState: $viewModel.swipeActionState,
                onActionPresented: {
                    viewModel.perform(action: .presentingSwipeAction)
                },
                action: {
                    guard let action = viewModel.swipeAction else {
                        return
                    }
                    viewModel.perform(action: action)
                }
            )
    }
}

private struct UserCardBodyView: View {
    @EnvironmentObject private var viewModel: UserCardViewModel

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Color.neutral300
                HStack(spacing: 0.0) {
                    AvatarView().frame(width: min(geometry.size.width * 0.42, 200.0))
                    InfoView()
                }
                .onTapGesture {
                    viewModel.perform(action: .selected)
                }
                AvatarOverlayView().alignLeading()
            }
        }
    }
}

private struct InfoView: View {
    @EnvironmentObject private var viewModel: UserCardViewModel

    var body: some View {
        ZStack {
            Color.white
            VStack(spacing: 0.0) {
                TitleHeaderView()
                ZStack {
                    if viewModel.isNew {
                        StatusView(title: viewModel.newTitle, color: .secondary700)
                            .alignLeading()
                    } else if viewModel.user.recommendationsCount > 0 {
                        UserRatingView()
                    }
                }.padding(.top, -.spXS)
                UserInfoView(hasTopView: viewModel.user.isNew || viewModel.user.recommendationsCount > 0)
                if viewModel.showAvailability {
                    UserAvailabilityView()
                        .padding(.top, .spS)
                        .padding(.trailing, .spM)
                }
            }
            .padding([.leading, .top, .bottom], .spM)
        }
    }
}

private struct UserRatingView: View {
    @EnvironmentObject private var viewModel: UserCardViewModel

    var body: some View {
        HStack(spacing: 2.0) {
            ForEach((0...4), id: \.self) {
                switch viewModel.user.recommendationScore - Double($0) {
                case ..<0.5:
                    Image(.starEmpty).resizable().frame(width: 12, height: 12).scaledToFit()
                case 1...:
                    Image(.starFilled).resizable().frame(width: 12, height: 12).scaledToFit()
                default:
                    Image(.starHalfFilled).resizable().frame(width: 12, height: 12).scaledToFit()
                }
            }
            Text("\(viewModel.user.recommendationsCount)")
                .font(.body4)
                .foregroundColor(.neutral900)
                .padding(.leading, 2.0)
            Spacer()
        }
        .frame(height: 20)
    }
}

private struct AvatarView: View {
    @EnvironmentObject private var viewModel: UserCardViewModel

    var body: some View {
        ZStack {
            Color.neutral300
            AsyncCachedImage(
                url: viewModel.user.avatarURL,
                placeholderImage: viewModel.user.placeholderImage
            ) { image in
                image
            }
        }
    }
}

private struct AvatarOverlayView: View {
    @EnvironmentObject private var viewModel: UserCardViewModel

    var body: some View {
        VStack {
            ZStack {
                Circle()
                    .frame(width: .spM, height: .spM)
                    .foregroundColor(.shadesWhite)
                Circle()
                    .frame(width: .spS, height: .spS)
                    .foregroundColor(viewModel.user.isOnline ? .success500 : .neutral500)
            }
            .alignLeading()
            .padding(.spM)
            Spacer()
            if viewModel.isPremium {
                StatusView(title: viewModel.premiumTitle, color: Color.primary500)
                    .alignLeading()
                    .padding(.spM)
            }
        }
    }
}

private struct StatusView: View {
    let title: String
    let color: Color

    var body: some View {
        HStack {
            Text(title)
                .font(.body4)
                .foregroundColor(.white)
                .padding(.spXS)
        }
        .frame(height: 20, alignment: .leading)
        .background { color }
        .cornerRadius(.spXS)
    }
}

private struct TitleHeaderView: View {
    @EnvironmentObject private var viewModel: UserCardViewModel

    var body: some View {
        HStack(alignment: .top, spacing: 0.0) {
            HStack(spacing: 0.0) {
                Text(viewModel.user.firstName)
                    .font(.header6)
                    .lineLimit(1)
                    .padding(.trailing, .spXS)
                if !viewModel.isViewed {
                    Circle()
                        .frame(width: .spS, height: .spS)
                        .foregroundColor(.primary500)
                }
            }
            Spacer()
            ZStack {
                Circle()
                    .frame(width: 28, height: 28)
                    .foregroundColor(.neutral100)
                if let icon = viewModel.headerAction.icon {
                    Image(uiImage: icon)
                }
            }
            .onTapGesture {
                viewModel.perform(action: viewModel.headerAction)
            }
            .padding(.trailing, .spM)
        }
    }
}

private struct AvailabilityDayView: View {
    let title: String
    let isAvailable: Bool

    var body: some View {
        HStack(spacing: .spXS) {
            VStack(alignment: .center, spacing: 0) {
                Text(title)
                    .font(.body4)
                    .foregroundColor(isAvailable ? .shadesWhite : .neutral500)
                Image(isAvailable ? .checkmarkCalendar : .crossCalendar)
            }
            .padding(.horizontal, 2)
            .frame(height: 30, alignment: .top)
            .frame(maxWidth: .infinity)
            .background(isAvailable ? .neutral700 : .neutral100)
            .cornerRadius(.spXS)
        }
    }
}

private struct UserAvailabilityView: View {
    @EnvironmentObject private var viewModel: UserCardViewModel

    var body: some View {
        HStack(spacing: .spXS) {
            ForEach(Day.allCases) { day in
                AvailabilityDayView(
                    title: day.shortLocalized,
                    isAvailable: (viewModel.user.availability.days[day]?.count ?? 0) > 0
                )
            }
        }
    }
}

private struct UserInfoView: View {
    @EnvironmentObject private var viewModel: UserCardViewModel
    let hasTopView: Bool

    var body: some View {
        Text(viewModel.user.userDescriptionText)
            .sitlyFont(.body4)
            .foregroundColor(.neutral900)
            .frame(maxWidth: .infinity, alignment: .topLeading)
            .padding(.top, hasTopView ? .spXS : -.spXS)
            .padding(.trailing, .spM)
        Spacer()
        Text(viewModel.additionalAvailabilityText)
            .lineLimit(2)
            .sitlyFont(.body4)
            .foregroundColor(.neutral900)
            .padding(.trailing, .spM)
            .frame(maxWidth: .infinity, alignment: .topLeading)
    }
}

extension UserCardView {
    static func viewHeight(isParent: Bool) -> CGFloat {
        return isParent ? 245 : 208
    }
    static var smallHeight: CGFloat = 170.0
}

#if DEBUG
private let userDTO = UserDTO(
    entityId: "some_id",
    isParent: false,
    gender: .female,
    avatarURL: URL(string: "https://rb.gy/n2ff59"),
    isNew: false,
    isPremium: true,
    firstName: "Asuka Langley",
    isOnline: true,
    isFavorite: true,
    availability: Availability(),
    userDescription: ["22 years old", "2km from you", "1 year experience"],
    additionalAvailabilityText: "Occasional, after-school &\nregular care, on:",
    additionalAvailabilityNoShedule: "Occasional, after-school &\nregular",
    recommendationScore: 3.5,
    recommendationsCount: 0
)

#Preview {
    UserCardView()
        .environmentObject(
            UserCardViewModel(user: userDTO, forceHidePremium: false, swipeAction: .hide)
        )
}
#endif
