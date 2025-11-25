import UIKit

protocol BaseViewProtocol: MessageDisplayable, ActivityIndicatorDisplayable, MoveBackHandlable {}

protocol ActivityIndicatorDisplayable: AnyObject {
    func showActivityIndicator()
    @discardableResult func showBlockingActivityIndicator() -> LoadingIndicatorView
    func hideActivityIndicator()
}

protocol MessageDisplayable: AnyObject {
    func showMessage(title: String, message: String, actions: [AlertAction])
    func showAlertFor(errorType: ConnectionErrorType)
    func flashMessage(_ message: String)
}

protocol MoveBackHandlable {
    func handleBackButtonPress()
}

class BaseViewController: UIViewController, BaseViewProtocol {
    private let reachability = Reachability()
    class var storyboard: UIStoryboard {
        return .main
    }
    private var observers = [NotificationCenterTokenHolder]()

    lazy var activityIndicatorBase: CircleActivityIndicator = { [weak self] in
        if let strongSelf = self {
            strongSelf.view.addSubview($0)
            $0.centerXAnchor.constraint(equalTo: strongSelf.view.centerXAnchor).isActive = true
            $0.centerYAnchor.constraint(equalTo: strongSelf.view.centerYAnchor).isActive = true
        }
        return $0
    }(CircleActivityIndicator.autolayoutInstance())
    private lazy var loadingView: LoadingIndicatorView = { [weak self] in
        if let strongSelf = self {
            strongSelf.view.addSubview($0)
            NSLayoutConstraint.addToAllCorners($0, toItem: strongSelf.view)
        }
        return $0
    }(LoadingIndicatorView.autolayoutInstance())
    lazy var keyboardOnTapHider = KeyboardOnTapHider()

    var noInternetConnection = NoInternetConnectionView(frame: CGRect(
        x: 0, y: UIApplication.shared.keyWindow?.safeAreaInsets.top ?? 0,
        width: UIScreen.main.bounds.width, height: 0
    ))
    var nextButton: UIButton?
    var backButton: UIButton?

    deinit {
        reachability?.stopNotifier()
    }

    final class func instantiateFromStoryboard() -> Self {
        return storyboard.instantiateViewController(ofType: self)!
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        try? reachability?.startNotifier()
        reachability?.whenReachable = { [weak self] _ in
            guard let strongSelf = self else { return }

            if strongSelf.isViewLoaded && strongSelf.view.window != nil, strongSelf.presentedViewController is ConnectionErrorViewController {
                strongSelf.dismiss(animated: true)
            }

            strongSelf.noInternetConnection.hide()
            strongSelf.connectionStatusChanged(connected: true)
        }
        reachability?.whenUnreachable = { [weak self] _ in
            guard let strongSelf = self else { return }

            strongSelf.noInternetConnection.show(viewController: strongSelf)
            let showAlert =
                strongSelf.isViewLoaded && strongSelf.view.window != nil
                && strongSelf.presentedViewController == nil && !(self is ConnectionErrorViewController)
            if showAlert {
                strongSelf.showAlertFor(errorType: .offline)
            }

            strongSelf.connectionStatusChanged(connected: true)
        }

        AnalyticsManager.visitedScreen(controller: self)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        if !Reachability.isOnline {
            self.noInternetConnection.show(viewController: self)
        } else {
            self.noInternetConnection.hide()
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)

        reachability?.stopNotifier()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    func connectionStatusChanged(connected: Bool) {}

    func addTopGradientBar() {
        let imageView = UIImageView.autolayoutInstance()
        imageView.backgroundColor = .clear
        imageView.image = #imageLiteral(resourceName: "NavigationBarGradient").resizableImage(withCapInsets: UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 1))
        view.addSubview(imageView)
        NSLayoutConstraint.activate([
            imageView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            imageView.topAnchor.constraint(equalTo: view.topAnchor),
            imageView.heightAnchor.constraint(equalToConstant: 44)
        ])
    }

    func addNextButton() {
        if nextButton != nil {
            return
        }

        let button = UIButton.autolayoutInstance()
        button.setImage(#imageLiteral(resourceName: "ButtonNextNormal"), for: .normal)
        button.addTarget(self, action: #selector(onNextPressed), for: .touchUpInside)
        view.addSubview(button)
        nextButton = button

        let inset = CGFloat(12)
        let bottomConstraint = button.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -inset)
        NSLayoutConstraint.activate([
            bottomConstraint,
            button.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -inset)
        ])

        let setShown: (_ shown: Bool, _ notification: Notification) -> Void = { [weak self] (shown, notification) in
            if  let info = notification.userInfo,
                let duration = info[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double,
                let keyboardFrameBeginRect = (info[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue {
                    bottomConstraint.constant = (shown ? -keyboardFrameBeginRect.size.height : 0) - inset
                    UIView.animate(withDuration: duration) {
                        self?.view.layoutIfNeeded()
                    }
            }
        }
        observers.append(NotificationCenterTokenHolder(
            NotificationCenter.default.addObserver(forName: UIResponder.keyboardWillShowNotification, object: nil, queue: nil) {
                setShown(true, $0)
            }
        ))
        observers.append(NotificationCenterTokenHolder(
            NotificationCenter.default.addObserver(forName: UIResponder.keyboardWillHideNotification, object: nil, queue: nil) {
                setShown(false, $0)
            }
        ))
    }

    func setNextButtonEnabled(_ enabled: Bool) {
        nextButton?.setImage(enabled ? #imageLiteral(resourceName: "ButtonNextNormal") : #imageLiteral(resourceName: "ButtonNextDisabled"), for: .normal)
    }

    func addBackButton() {
        let button = UIButton.autolayoutInstance()
        button.setImage(#imageLiteral(resourceName: "back_button"), for: .normal)
        button.addTarget(self, action: #selector(handleBackButtonPress), for: .touchUpInside)
        view.addSubview(button)
        backButton = button

        NSLayoutConstraint.activate([
            button.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 15),
            button.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 13)
        ])
    }

    @objc func onNextPressed() {}

    @IBAction func handleBackButtonPress() {
        if let navigationController = self.navigationController {
            if navigationController.viewControllers.count == 1 {
                navigationController.dismiss(animated: true)
            } else {
                _ = navigationController.popViewController(animated: true)
            }
        } else if presentingViewController != nil {
            dismiss(animated: true)
        }
    }

    func needsToShowActivityIndicator() -> Bool {
        return true
    }
}

extension BaseViewController: ActivityIndicatorDisplayable {
    func showActivityIndicator() {
        if !needsToShowActivityIndicator() {
            return
        }
        activityIndicatorBase.startAnimating()
    }

    @discardableResult func showBlockingActivityIndicator() -> LoadingIndicatorView {
        if !needsToShowActivityIndicator() {
            return loadingView
        }

        loadingView.titleLabel.text = nil
        loadingView.shown = true
        return loadingView
    }

    func hideActivityIndicator() {
        activityIndicatorBase.stopAnimating()
        loadingView.shown = false
    }
}

extension BaseViewController: MessageDisplayable {
    func showMessage(title: String, message: String, actions: [AlertAction]) {
        let viewController = AlertViewController.instantiateFromStoryboard()
        viewController.setUpView(title: title, message: message, actions: actions)
        present(viewController, animated: true)
    }

    func showAlertFor(errorType: ConnectionErrorType) {
        let connectionErrorViewController = UIStoryboard.main.instantiateViewController(ofType: ConnectionErrorViewController.self)!
        connectionErrorViewController.connectionErrorType = errorType
        present(connectionErrorViewController, animated: true)
    }
}
