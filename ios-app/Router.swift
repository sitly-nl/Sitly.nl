import UIKit
import SwiftUI
import StoreKit

class Router {
    static var window: UIWindow = {
        $0.rootViewController = rootViewController
        return $0
    }(UIWindow(frame: UIScreen.main.bounds))
    private(set) static var rootViewController = BaseNavigationController()
    private static var tabBarController: TabBarController? {
        rootViewController
            .viewControllers
            .first(where: { $0 is TabBarController }) as? TabBarController
    }

// MARK: - Init
    class func showInitialLoading() {
        Router.showInRootViewController(SplashViewController.instantiateFromStoryboard())
    }

    class func handleSignIn(user: User) {
        if !user.completed, let url = URL(string: user.completionUrl) {
            Router.restoreSignUp(url: url)
        } else {
            Router.moveToSignInState()
        }
    }

    class func premium(onDismiss: ((Bool) -> Void)? = nil) -> PurchasePremiumViewController {
        let controller = PurchasePremiumViewController.instantiateFromStoryboard()
        let configService = AppDelegate.diContainer.resolve(ConfigServiceable.self)
        let presenter = PurchasePremiumPresenter(
            view: controller,
            useAlternativeWording: configService.forceHidePremium
        )
        if onDismiss != nil {
            presenter.onClosed = onDismiss
        }
        controller.presenter = presenter
        return controller
    }

    class func moveToSignInState(
        _ isSignIn: Bool = true,
        animated: Bool = false
    ) {
        if isSignIn {
            Router.moveToSignedInState(
                selectControllerOfType: String(describing: SearchViewController.self),
                animated: animated
            )
            let remoteHandler = AppDelegate.diContainer.resolve(RemoteActivityHandlerProtocol.self)
            // cover cases with cold log in
            remoteHandler.handlePendingAction()
        } else {
            Router.rootViewController.presentedViewController?.dismiss(animated: false)
            Router.showInRootViewController(Router.startViewController(), animated: animated)
        }
    }

    private class func moveToSignedInState(
        selectControllerOfType: String,
        action: RemoteActivityType? = nil,
        animated: Bool = false
    ) {
        let tabBarController = TabBarController.instantiateFromStoryboard()
        tabBarController.setViewControllers(
            [
                Router.saved(),
                Router.search(),
                Router.invites(),
                Router.messages(action: action),
                Router.profile()
            ].compactMap { $0 },
            animated: false
        )
        tabBarController.selectViewController(ofType: selectControllerOfType)
        tabBarController.delegate = AnalyticsManager.tabBarControllerDelegate
        tabBarController.setStatusProvider(
            statusProvider: AppDelegate.diContainer.resolve(TabBarCoordinatorProtocol.self)
        )
        Router.showInRootViewController(tabBarController, animated: animated)
    }

    private class func showInRootViewController(_ viewController: UIViewController, animated: Bool = false) {
        Router.rootViewController.setViewControllers([viewController], animated: animated)
    }

// MARK: - Start screen
    class func startViewController() -> StartViewController {
        let viewController = StartViewController.instantiateFromStoryboard()

        let presenter = StartPresenter(baseView: viewController)
        presenter.showSignIn = {
            rootViewController.pushViewController(Router.signIn(), animated: true)
            AnalyticsManager.logEvent(.startClickSignIn)
        }
        presenter.showSignUp = {
            rootViewController.pushViewController(Router.signUp(), animated: true)
            AnalyticsManager.logEvent(.startClickSignUp)
        }
        viewController.presenter = presenter
        return viewController
    }

// MARK: - Overlays / popups
    class func showAvatarOverlay() {
        if let tabBarController = Router.rootViewController.viewControllers.first(where: { $0 is TabBarController }) {
            UploadAvatarOverlayController().showFrom(viewController: tabBarController)
        }
    }

    class func showAvatarValidationForPrompt(user: User) {
        guard
            let contextController = Router.topViewController() as? BaseViewController,
            let avatarUrl = user.avatarUrl(imageSize: 400)
        else {
            return
        }

        let validationController = AvatarValidationViewController.instantiateFromStoryboard()
        validationController.configure(
            input: .alreadyUploadedUrl(avatarUrl), validationResult: AvatarValidationResult(mandatory: [], optional: [.filterOverlay])
        )
        contextController.present(validationController, animated: true)
        validationController.completion = { userDecision in
            let uploadAvatarService = UploadAvatarService()

            switch userDecision {
            case .chooseAnother:
                var imagePicker: ImagePicker? = ImagePicker(parentController: contextController)
                imagePicker?.showImagePickerActionSheet { image in
                    imagePicker = nil

                    if let image {
                        let loadingView = contextController.showBlockingActivityIndicator()
                        loadingView.shown = true
                        loadingView.titleLabel.attributedText = NSAttributedString(
                            string: "Your photo is being processed".localized,
                            attributes: [
                                .foregroundColor: UIColor.white,
                                .font: UIFont.openSans(size: 17)
                            ])

                        UploadAvatarService().upload(image: image, contextController: contextController, completion: { response in
                            if case .failure = response {
                                uploadAvatarService.markAsIgnoredAvatarOverlayPrompt()
                            }
                            contextController.hideActivityIndicator()
                        })
                    } else {
                        uploadAvatarService.markAsIgnoredAvatarOverlayPrompt()
                    }
                }
            case .useThis, .close:
                uploadAvatarService.markAsIgnoredAvatarOverlayPrompt()
            }
        }
    }

    @discardableResult
    class func showAvailabilityReminder(user: User) -> AvailabilityReminderViewController {
        let availabilityReminderVc = AvailabilityReminderViewController.instantiateFromStoryboard()
        availabilityReminderVc.presenter = AvailabilityReminderPresenter(view: availabilityReminderVc, userService: UserService(), user: user)
        availabilityReminderVc.presenter.showDisable = { [unowned availabilityReminderVc] in
            let disableViewController = Router.disableUser()
            availabilityReminderVc.present(disableViewController, animated: true)
            disableViewController.closeModalButton.isHidden = true
        }
        Router.presentViewControllerOnTop(availabilityReminderVc, animated: true)
        return availabilityReminderVc
    }

    class func showNewAppVersionOverlay() {
        if let tabBarController = Router.rootViewController.viewControllers.first(where: { $0 is TabBarController }) {
            NewAppVersionOverlayController().showFrom(viewController: tabBarController)
        }
    }

    class func showFeedbackOverlay(forSatisfiedUser: Bool) {
        if let tabBarController = Router.rootViewController.viewControllers.firstOfType(TabBarController.self) {
            let controller = FeedbackOverlayController()
            controller.showFeedbackOptions = {
                let optionsViewController = FeedbackOptionsViewController.instantiateFromStoryboard()
                optionsViewController.showFeedbackExplanation = { type in
                    rootViewController.pushViewController(feedbackExplanation(type: type), animated: true)
                }
                optionsViewController.showWriteFeedback = {
                    rootViewController.pushViewController(feedback(type: .complainElse), animated: true)
                }
                rootViewController.pushViewController(optionsViewController, animated: true)
            }
            controller.showFrom(viewController: tabBarController)
            controller.forSatisfiedUser = forSatisfiedUser
        }
    }

    class func showUserNotFound() {
        if let tabBarController = Router.rootViewController.viewControllers.firstOfType(TabBarController.self) {
            rootViewController.popToViewController(tabBarController, animated: false)

            let controller = UserNotFoundOverlayController()
            controller.showFrom(viewController: tabBarController)
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
                controller.close()
            }
        }
    }

    class func showAppRating() {
        if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
            SKStoreReviewController.requestReview(in: scene)
        }
    }

    class func showPopUp(title: String, description: String, closeText: String) {
        let popUpContainerViewController = PopUpContainerViewController()

        Router.presentViewControllerOnTop(popUpContainerViewController)

        popUpContainerViewController.loadViewToContainer(PopUpView(
            title: title,
            description: description,
            buttons: [
                PopUpView.ButtonType.primary.button(
                    title: closeText, target: popUpContainerViewController, selector: #selector(PopUpContainerViewController.onClosePressed)
                )
            ]
        ))
    }

    class func showUserReEnabled() {
        Router.showPopUp(
            title: "popUp.reEnabled.title".localized, description: "popUp.reEnabled.description".localized, closeText: "Ok, let's go!".localized
        )
    }

    class func showSelectCountry(countries: [Country], completion: @escaping (Country?) -> Void) {
        let swiftUIView = CountrySelector(
            countries: countries,
            close: {
                completion(nil)
                Router.topViewController()?.dismiss(animated: true)
            },
            select: { country in
                completion(country)
                Router.topViewController()?.dismiss(animated: true)
            },
            selectedCountry: countries[0]
        )
        let viewController = UIHostingController(rootView: swiftUIView)
        viewController.modalPresentationStyle = .overFullScreen
        viewController.view.backgroundColor = UIColor.black.withAlphaComponent(0.2)
        Router.topViewController()?.present(viewController, animated: true)
    }

// MARK: - Feedback
    private class func feedbackExplanation(type: FeedbackExplanationViewController.ViewType) -> FeedbackExplanationViewController {
        let controller = FeedbackExplanationViewController.instantiateFromStoryboard()
        controller.configure(type: type)
        controller.showWriteFeedback = { [unowned controller] in
            controller.navigationController?.pushViewController(feedback(type: .complainMain), animated: true)
        }
        controller.close = Router.moveToTabbar
        return controller
    }

// MARK: - Tabbar items
    class func showChat(action: RemoteActivityType) {
        Router.moveToSignedInState(selectControllerOfType: TabKind.messages.vcName, action: action)
    }

    class func showSearch() {
        Router.moveToSignedInState(selectControllerOfType: TabKind.search.vcName)
        (Router.rootViewController.viewControllers.last as? UITabBarController)
            .flatMap { $0.selectedViewController as? SearchViewController }
            .flatMap { $0.showMostRecent = true }
    }

    class func moveToTabbar() {
        if let tabBarController = rootViewController.viewControllers.first(where: { $0 is TabBarController }) {
            rootViewController.popToViewController(tabBarController, animated: true)
        }
    }

    class func switchTo(tab: TabKind) {
        tabBarController?.selectViewController(ofType: tab.vcName)
    }

// MARK: - Saved
    class func saved() -> UIViewController {
        let controller = SavedViewController.instantiateFromStoryboard()
        controller.presenter = SavedPresenter(
            view: controller,
            favoriteService: FavoriteService(),
            configService: AppDelegate.diContainer.resolve(ConfigServiceable.self)
        )
        return controller
    }

// MARK: - Search
    class func search() -> UIViewController {
        let controller = SearchViewController.instantiateFromStoryboard()
        controller.presenter = SearchPresenter(
            view: controller,
            userService: UserService(),
            favoriteService: FavoriteService(),
            searchService: SearchService(),
            configService: AppDelegate.diContainer.resolve(ConfigServiceable.self)
        )
        controller.presenter.showHiddenUsers = Router.showHiddenUsers
        controller.presenter.showMap = Router.showMap
        controller.presenter.showFindJobExplanation = { [unowned controller] user in
            if let disabledTill = user.jobPostingDisabledTill {
                Router.showPopUp(
                    title: "popUp.jobPosting.reachedLimit.title".localized,
                    description: String(
                        format: "popUp.jobPosting.reachedLimit.description.format".localized,
                        DateFormatter.ddMMM.string(from: disabledTill)
                    ),
                    closeText: "close".localized)
            } else {
                controller.present(Router.jobPostingExplanation(), animated: true)
            }
        }
        controller.tabBarItem.image = #imageLiteral(resourceName: "search_menu").withRenderingMode(.alwaysOriginal)
        return controller
    }

// MARK: - Messages
    class func messages(action: RemoteActivityType? = nil) -> UIViewController? {
        return ScreensFactory.conversations?.createConversationsRootView(action: action)
    }

    class func invites() -> UIViewController? {
        return ScreensFactory.invites?.createInvitesRootView()
    }

    class func showSafetyTips(htmlString: String) {
        let viewController = SafetyTipsViewController.instantiateFromStoryboard()
        viewController.htmlContent = htmlString
        Router.topViewController()?.present(viewController, animated: true)
    }

// MARK: - Profile transitions
    class func showProfile() {
        Router.moveToSignedInState(selectControllerOfType: String(describing: ProfileViewController.self))
    }

    class func showUserProfile(userId: String, action: ProfileAction? = nil) {
        let user = User()
        user.id = userId

        let controller = Router.publicProfile(user: user)
        Router.presentViewControllerOnTop(BaseNavigationController(rootViewController: controller))
        if action == .report {
            controller.present(Router.report(user: user), animated: true)
        }
    }

// MARK: - Map
    class func showMap() {
        let controller = UIStoryboard.search.instantiateViewController(ofType: MapViewController.self)!
        controller.presenter = MapPresenter(
            view: controller,
            searchService: SearchService(),
            favoriteService: FavoriteService(),
            userService: UserService(),
            configService: AppDelegate.diContainer.resolve(ConfigServiceable.self)
        )
        Router.push(controller)
    }

// MARK: - Help
    class func help() -> HelpViewController {
        let controller = HelpViewController.instantiateFromStoryboard()
        controller.presenter = HelpPresenter(view: controller, configService: ConfigService())
        return controller
    }

// MARK: - Hidden users
    class func showHiddenUsers() {
        let hiddenProfilesVc = HiddenProfilesViewController.instantiateFromStoryboard()
        hiddenProfilesVc.presenter = HiddenProfilesPresenter(
            view: hiddenProfilesVc,
            userService: UserService(),
            configService: AppDelegate.diContainer.resolve(ConfigServiceable.self)
        )
        Router.push(hiddenProfilesVc)
    }

// MARK: - Notifications
    class func showNotification(model: NotificationViewModel) {
        let topInset = UIApplication.shared.keyWindow?.safeAreaInsets.top ?? 0
        let notificationView = NotificationView(frame: CGRect(x: 0, y: topInset, width: UIScreen.main.bounds.width, height: 0))
        Router.rootViewController.view.addSubview(notificationView)
        notificationView.show(model: model)
    }

// MARK: - General
    class func presentViewControllerOnTop(_ viewController: UIViewController, animated: Bool = false, checkUniqueness: Bool = true) {
        if  let topViewController = Router.topViewController(),
            checkUniqueness && type(of: topViewController) != type(of: viewController) {
                topViewController.present(viewController, animated: animated)
        }
    }

    class func topViewController(
        controller: UIViewController? = UIApplication.shared.keyWindow?.rootViewController
    ) -> UIViewController? {
        if let navigationController = controller as? UINavigationController {
            return topViewController(controller: navigationController.visibleViewController)
        }
        if let tabController = controller as? UITabBarController {
            if let selected = tabController.selectedViewController {
                return topViewController(controller: selected)
            }
        }
        if let presented = controller?.presentedViewController {
            return topViewController(controller: presented)
        }
        return controller
    }

    class func push(_ viewController: UIViewController) {
        Router.rootViewController.pushViewController(viewController, animated: true)
    }
}
