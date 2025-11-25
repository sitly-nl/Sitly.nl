import UIKit

extension Router {
    class func showRecommendationPrompt() {
        guard
            let searchViewController = Router.rootViewController
                .viewControllers.firstOfType(TabBarController.self)?
                .viewControllers?.firstOfType(SearchViewController.self)
        else { return }

        let controller = RecommendationOverlayController()
        controller.askForRecommendation = {
            Router.topViewController().flatMap { Router.presentAskRecommendation(from: $0) }
        }
        controller.showFrom(viewController: searchViewController)
    }

    class func presentAskRecommendation(from controller: UIViewController) {
        let infoViewController = AskRecommendationInfoViewController()
        infoViewController.okPressed = {
            controller.present(Router.askRecommendation(), animated: true)
        }
        controller.present(infoViewController, animated: true)
    }

    private class func askRecommendation() -> UINavigationController {
        let controller = RecommendationsUsersListViewController.instantiateFromStoryboard()
        let navigationController = UINavigationController(rootViewController: controller)

        controller.presenter = RecommendationsUsersListPresenter(view: controller)
        controller.presenter.showInfo = { [unowned controller] in
            controller.present(AskRecommendationInfoViewController(), animated: true)
        }
        controller.presenter.showNotOnSitly = { [weak navigationController] skippingTransition in
            guard let navigationController = navigationController else {
                return
            }

            if skippingTransition {
                let transition = CATransition()
                transition.duration = UIView.defaultAnimationDuration
                transition.type = .fade
                navigationController.view.layer.add(transition, forKey: nil)

                let controller = Router.recommendationUserName()
                controller.view.layoutIfNeeded()
                controller.backButton?.setImage(#imageLiteral(resourceName: "close_button"), for: .normal)
                navigationController.setViewControllers([controller], animated: false)
            } else {
                navigationController.pushViewController(Router.recommendationUserName(), animated: true)
            }
        }
        controller.presenter.showNext = { [weak navigationController] user in
            navigationController?.pushViewController(Router.sendRecommendation(type: .user(user)), animated: true)
        }

        navigationController.isNavigationBarHidden = true
        return navigationController
    }

    class func recommendationUserName() -> RecommendationsUserNameViewController {
        let controller = RecommendationsUserNameViewController.instantiateFromStoryboard()
        controller.presenter = RecommendationsUserNamePresenter(view: controller)
        controller.presenter.showInfo = { [unowned controller] in
            controller.present(AskRecommendationInfoViewController(), animated: true)
        }
        controller.presenter.showNext = { [unowned controller] name in
            controller.navigationController?.pushViewController(Router.sendRecommendation(type: .userName(name)), animated: true)
        }
        return controller
    }

    class func sendRecommendation(type: RecommendationRecepientType) -> SendRecommendationsViewController {
        let controller = SendRecommendationsViewController.instantiateFromStoryboard()
        controller.presenter = SendRecommendationsPresenter(view: controller, type: type)
        controller.presenter.showInfo = { [unowned controller] in
            controller.present(AskRecommendationInfoViewController(), animated: true)
        }
        controller.presenter.onSentSuccessfully = { [unowned controller] in
            let userName = controller.presenter.type.name
            controller.dismiss(animated: true) {
                Router.showRecommendationSentConfirmation(userName: userName)
            }
        }
        return controller
    }

    class func showRecommendationSentConfirmation(userName: String) {
        let controller = PopUpContainerViewController()
        Router.topViewController()?.present(controller, animated: true)

        controller.loadViewToContainer(PopUpView(
            title: "recommendation.send.success.title".localized,
            description: String(format: "recommendation.send.success.description.format".localized, userName),
            buttons: [PopUpView.ButtonType.primary.button(
                title: "Ask another parent".localized,
                target: Router.self,
                selector: #selector(Router.askAnotherRecommendation))
            ]
        ))
    }

    @objc class func askAnotherRecommendation() {
        Router.topViewController()?.dismiss(animated: true, completion: {
            Router.topViewController()?.present(Router.askRecommendation(), animated: true)
        })
    }
}
