//
//  InvitesRootView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct InvitesRootView: View {
    @EnvironmentObject private var viewModel: InvitesRootViewModel
    @State private var promtHighlightRect: CGRect?
    @State private var promtPointRect: CGRect?

    var body: some View {
        ZStack {
            ZStack(alignment: .top) {
                Color.neutral100
                VStack(spacing: 0.0) {
                    NavigationBarView(
                        title: viewModel.screenTitle,
                        leftButtons: { EmptyView() },
                        rightButtons: { EmptyView() },
                        customTitle: { EmptyView() }
                    )
                    if viewModel.userCards != nil {
                        InvitesRootContentView()
                    }
                    Color.shadesWhite.frame(height: 0.5)
                        .trackPointRectIfNeeded(true)
                }
            }
            .navigationBarHidden(true)
            .colorStatusBar()
            .onAppear {
                viewModel.onAppear()
            }
            .onDisappear {
                viewModel.onDisappear()
            }
            if viewModel.isLoading {
                ActivityIndicatorView()
            }
            ComposedTooltipOverlayView(
                viewModel: $viewModel.tooltipOverlay,
                promtHighlightRect: $promtHighlightRect,
                promtPointRect: $promtPointRect
            )
        }
        .readTargetRect(promtHighlightRect: $promtHighlightRect, promtPointRect: $promtPointRect)
        .navigationListener($viewModel.navDestination)
        .webPresenter($viewModel.showSurvey)
    }
}

private struct InvitesRootContentView: View {
    @EnvironmentObject private var viewModel: InvitesRootViewModel

    var body: some View {
        if viewModel.userCards?.isEmpty ?? true {
            InvitesRootEmptyStateView()
        } else {
            VStack(spacing: 0.0) {
                if viewModel.shouldShowInfoNote {
                    InfoNoteView(text: viewModel.infoText) { viewModel.didTapOnCloseInfoView() }
                }
                if let items = viewModel.userCards?.enumerated().map({ $0 }) {
                    ForEach(items, id: \.element.id) { index, userCard in
                        UserCardView()
                            .environmentObject(userCard)
                            .padding(.top, viewModel.shouldShowInfoNote && index == 0 ? 0.0 : .spM)
                            .onAppear {
                                viewModel.loadNextResultsIfNeeded(index: index)
                            }
                        if index == items.count - 1 {
                            Color.clear.frame(height: .spM)
                        }
                    }
                    .makeList()
                }
            }
        }
    }
}

private struct InvitesRootEmptyStateView: View {
    @EnvironmentObject private var viewModel: InvitesRootViewModel

    var body: some View {
        ZStack(alignment: .top) {
            if viewModel.shouldShowInfoNote {
                InfoNoteView(text: viewModel.infoText) { viewModel.didTapOnCloseInfoView() }
            }
            BasicEmptyStateView(
                emptyStateText: viewModel.emptyStateText,
                btnConfig: viewModel.searchBtnConfig
            )
        }
    }
}

#if DEBUG
#Preview {
    InvitesRootView()
        .environmentObject(
            InvitesRootViewModel(
                currentUserProvider: CurrentUserProviderMock(),
                userSettings: UserSettingsMock(),
                invitesService: InvitesServiceMock(),
                favoritesService: FavoritesServiceMock(),
                userService: UserPersistenceServiceMock(),
                configService: ConfigServiceMock(),
                updateService: UpdatesServiceMock(),
                profileFactory: PublicProfileViewModelFactoryMock(),
                tabBarCoordinator: TabBarCoordinator(),
                appBadgeService: AppBadgeServiceMock(),
                surveyService: SurveyServiceMock()
            )
        )
}
#endif
