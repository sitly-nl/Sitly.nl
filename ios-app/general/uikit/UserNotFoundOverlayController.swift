import UIKit

class UserNotFoundOverlayController: OverlayController {
    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = UIColor.neutral900.withAlphaComponent(0.91)
        let label = UILabel.autolayoutInstance()
        label.text = "general.userNotFound".localized
        label.numberOfLines = 0
        label.textColor = .white
        label.font = .openSans(size: 14)
        label.textAlignment = .center

        let container = UIView.autolayoutInstance()
        container.addSubview(label)
        NSLayoutConstraint.attachToSuperviewHorizontally(view: label, inset: 20)
        label.topAnchor.constraint(equalTo: container.topAnchor, constant: 16).isActive = true
        label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -21).isActive = true

        loadViewToContainer(container)
    }
}
