import UIKit

class PopUpContainerViewController: BaseViewController {
    let containerView = UIView.autolayoutInstance()
    let closeButton = UIButton.autolayoutInstance()
    var onDismissed: (() -> Void)?

    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    init() {
        super.init(nibName: nil, bundle: nil)

        modalTransitionStyle = .crossDissolve
        modalPresentationStyle = .overFullScreen
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = UIColor.black.withAlphaComponent(0.7)

        containerView.backgroundColor = .white
        containerView.cornerRadius = 3
        view.addSubview(containerView)

        closeButton.setImage(#imageLiteral(resourceName: "close_button"), for: .normal)
        closeButton.addTarget(self, action: #selector(onClosePressed), for: .touchUpInside)
        view.addSubview(closeButton)

        NSLayoutConstraint.activate([
            containerView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 25),
            containerView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -25),
            containerView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            containerView.heightAnchor.constraint(lessThanOrEqualToConstant: UIScreen.main.bounds.height - 100),
            closeButton.centerXAnchor.constraint(equalTo: containerView.trailingAnchor),
            closeButton.centerYAnchor.constraint(equalTo: containerView.topAnchor),
            closeButton.widthAnchor.constraint(equalToConstant: 44),
            closeButton.heightAnchor.constraint(equalToConstant: 44)
        ])
    }

    func loadViewToContainer(_ view: UIView) {
        let previousView = containerView.subviews.first

        containerView.addSubview(view)
        NSLayoutConstraint.attachToSuperview(view: view)
        containerView.layoutIfNeeded()

        view.alpha = 0
        UIView.animate(withDuration: UIView.defaultAnimationDuration, animations: {
            self.view.layoutIfNeeded()
            view.alpha = 1
            previousView?.alpha = 0
        }, completion: { _ in
            previousView?.removeFromSuperview()
        })
    }

    override func dismiss(animated flag: Bool, completion: (() -> Void)? = nil) {
        super.dismiss(animated: flag) {
            self.onDismissed?()
            completion?()
        }
    }

// MARK: - Actions
    @objc func onClosePressed() {
        dismiss(animated: true)
    }
}
