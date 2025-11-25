import UIKit

class NoInternetConnectionView: UIView {
    private var titleLabel = UILabel()
    private var descriptionLabel = UILabel()
    private var closeButton = UIButton()

    override init(frame: CGRect) {
        super.init(frame: frame)

        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)

        setUpView()
    }

    private func setUpView() {
        backgroundColor = .neutral900

        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        descriptionLabel.translatesAutoresizingMaskIntoConstraints = false
        closeButton.translatesAutoresizingMaskIntoConstraints = false

        let swipeGesture = UISwipeGestureRecognizer(target: self, action: #selector(hide))
        swipeGesture.direction = .up

        addGestureRecognizer(swipeGesture)

        addSubview(titleLabel)
        addSubview(descriptionLabel)
        addSubview(closeButton)

        titleLabel.font = UIFont.openSans(size: 14)
        titleLabel.textColor = .white
        titleLabel.textAlignment = .center
        titleLabel.text = "noInternetConnection".localized

        descriptionLabel.font = UIFont.openSansLight(size: 12)
        descriptionLabel.textColor = .white
        descriptionLabel.textAlignment = .center
        descriptionLabel.text = "changesNotSaved".localized

        closeButton.setImage(#imageLiteral(resourceName: "CloseBlueSmall"), for: .normal)

        closeButton.addTarget(self, action: #selector(hide), for: .touchUpInside)

        NSLayoutConstraint.activate(NSLayoutConstraint.constraints(
            withVisualFormat: "H:|-15-[title]-15-|",
            options: .init(rawValue: 0),
            metrics: nil,
            views: ["title": titleLabel]))
        NSLayoutConstraint.activate(NSLayoutConstraint.constraints(
            withVisualFormat: "H:|-15-[description]-15-|",
            options: .init(rawValue: 0),
            metrics: nil,
            views: ["description": descriptionLabel]))
        NSLayoutConstraint.activate(NSLayoutConstraint.constraints(
            withVisualFormat: "V:|->=4@999-[title(16@999)]-0@999-[description(16@999)]-8@999-|",
            options: .init(rawValue: 0),
            metrics: nil,
            views: ["title": titleLabel, "description": descriptionLabel]))

        NSLayoutConstraint.activate([
            NSLayoutConstraint(
                item: closeButton,
                attribute: .trailing,
                relatedBy: .equal,
                toItem: self,
                attribute: .trailing,
                multiplier: 1, constant: -15),
            NSLayoutConstraint(
                item: closeButton,
                attribute: .top,
                relatedBy: .equal,
                toItem: self,
                attribute: .top,
                multiplier: 1,
                constant: 0),
            NSLayoutConstraint(
                item: closeButton,
                attribute: .bottom,
                relatedBy: .equal,
                toItem: self,
                attribute: .bottom,
                multiplier: 1,
                constant: 0)
        ])
    }

    func show(viewController: UIViewController) {
        guard let navVc = viewController.navigationController, !viewController.isBeingPresented else {
            return
        }

        if !viewController.view.subviews.filter({ $0 is NoInternetConnectionView }).any {
            viewController.view.addSubview(self)
            self.frame.size.height = 0
        }

        UIView.animate(withDuration: 0.3) {
            self.alpha = 1
            self.frame.size.height = navVc.isNavigationBarHidden ? 64 : 46
        }
    }

    @objc func hide() {
        UIView.animate(withDuration: 0.3, animations: {
            self.alpha = 0
            self.frame.size.height = 0
        }, completion: { _ in
            self.removeFromSuperview()
        })
    }
}
