import SwiftUI

extension Router {
    // MARK: - Sign up
    class func signUp(appleToken: String? = nil) -> SignupViewController {
        let controller = SignupViewController.instantiateFromStoryboard()
        controller.presenter = SignupPresenter(view: controller)
        if let appleToken {
            controller.presenter.model.type = .appleToken(token: appleToken)
        }
        controller.presenter.showSignIn = {
            rootViewController.pushViewController(Router.signIn(), animated: true)
        }
        controller.presenter.showSignUpDetails = Router.showFirstSignUpDetailsScreen
        controller.presenter.showFacebookSignup = Router.showFacebookSignUp
        return controller
    }

    class func showFacebookSignUp(token: String, email: String?) {
        let viewController = FacebookSignupViewController.instantiateFromStoryboard()
        viewController.user.email = email ?? ""
        viewController.presenter = FacebookSignupPresenter(view: viewController, facebookToken: token)
        viewController.presenter.showSignUpDetails = Router.showFirstSignUpDetailsScreen
        Router.push(viewController)
    }

    class func webSignUp(url: URL) -> UIViewController {
        return UIHostingController(rootView: SignUpWebView(url: url))
    }

    class func showFirstSignUpDetailsScreen(user: User) {
        if let url = URL(string: user.completionUrl) {
            Router.push(Router.webSignUp(url: url))
        }
    }

    class func restoreSignUp(url: URL) {
        Router.rootViewController.viewControllers = [Router.startViewController(), Router.webSignUp(url: url)]
    }

// MARK: - Sign in
    class func signIn() -> LoginViewController {
        let controller = LoginViewController.instantiateFromStoryboard()
        controller.presenter = LoginPresenter(view: controller)
        controller.presenter?.showFacebookLogin = { status in
            Router.push(Router.facebookSignIn(status: status))
        }
        controller.presenter?.showForgotPassword = Router.showForgotPassword
        return controller
    }

    class func facebookSignIn(status: FacebookStatus) -> FacebookLoginViewController {
        let controller = FacebookLoginViewController.instantiateFromStoryboard()
        controller.presenter = FacebookLoginPresenter(view: controller)
        controller.status = status
        controller.presenter?.showForgotPassword = Router.showForgotPassword
        return controller
    }

// MARK: - Reset password
    class func showResetPassword(token: String, countryCode: String) {
        let controller = ResetPasswordViewController.instantiateFromStoryboard()
        controller.presenter = ResetPasswordPresenter(view: controller, token: token, countryCode: countryCode)
        Router.presentViewControllerOnTop(controller, animated: true)
    }

    class func showUserBacameUnauthorizedMessage() {
        Router.topViewController()?.flashMessage("Your session has been expired".localized)
    }

    class func forgotPassword(facebookFlow: Bool = false) -> ForgotPasswordViewController {
        let controller = ForgotPasswordViewController.instantiateFromStoryboard()
        controller.facebookFlow = facebookFlow
        controller.presenter = ForgotPasswordPresenter(view: controller)
        return controller
    }

    class func showForgotPassword() {
        Router.push(Router.forgotPassword())
    }
}
