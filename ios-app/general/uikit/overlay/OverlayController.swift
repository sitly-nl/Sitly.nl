import UIKit

class OverlayController: UIViewController {
    lazy var containerHeightConstraint = view.heightAnchor.constraint(equalToConstant: 0)

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = UIColor.neutral900.withAlphaComponent(0.95)
        view.translatesAutoresizingMaskIntoConstraints = false
    }

    func showFrom(viewController: UIViewController) {
        viewController.addChild(self)
        viewController.view.addSubview(view)
        didMove(toParent: viewController)

        var constraints = [
            view.leadingAnchor.constraint(equalTo: viewController.view.leadingAnchor),
            view.trailingAnchor.constraint(equalTo: viewController.view.trailingAnchor),
            containerHeightConstraint
        ]
        if let tabBarController = viewController as? UITabBarController {
            constraints.append(view.bottomAnchor.constraint(equalTo: tabBarController.tabBar.topAnchor))
        } else {
            constraints.append(view.bottomAnchor.constraint(equalTo: viewController.view.layoutMarginsGuide.bottomAnchor))
        }
        NSLayoutConstraint.activate(constraints)

        showInitialView()
    }

    func showInitialView() {}

    func loadViewToContainer(_ currentView: UIView) {
        let previousView = view.subviews.first

        view.addSubview(currentView)
        NSLayoutConstraint.attachToSuperviewHorizontally(view: currentView)
        currentView.centerYAnchor.constraint(equalTo: view.centerYAnchor).isActive = true
        view.layoutIfNeeded()
        containerHeightConstraint.constant = currentView.frame.size.height

        currentView.alpha = 0
        UIView.animate(withDuration: UIView.defaultAnimationDuration, animations: {
            self.view.superview?.layoutIfNeeded()
            currentView.alpha = 1
            previousView?.alpha = 0
        }, completion: { _ in
            previousView?.removeFromSuperview()
        })
    }

    @objc func close() {
        UIView.animate(withDuration: UIView.defaultAnimationDuration, animations: {
            self.view.alpha = 0
        }, completion: { _ in
            self.willMove(toParent: nil)
            self.view.removeFromSuperview()
            self.removeFromParent()
        })
    }

    @discardableResult func addCloseButton(superview: UIView) -> UIButton {
        let button = UIButton.autolayoutInstance()
        button.setImage(#imageLiteral(resourceName: "CloseFeedbackOverlay"), for: .normal)
        button.addTarget(self, action: #selector(close), for: .touchUpInside)
        superview.addSubview(button)
        NSLayoutConstraint.activate([
            button.widthAnchor.constraint(equalToConstant: 44),
            button.heightAnchor.constraint(equalToConstant: 44),
            button.leadingAnchor.constraint(equalTo: superview.leadingAnchor),
            button.topAnchor.constraint(equalTo: superview.topAnchor)
        ])
        return button
    }
}
