import UIKit

struct NotificationViewModel {
    let avatar: String?
    let name: String
    let message: String
    let userId: String

    init(dict: [AnyHashable: Any]) throws {
        avatar = try? dict.valueForKey("avatar")
        try name = dict.valueForKey("firstName")
        try message = dict.valueForKey("aps", ofType: [String: Any].self).valueForKey("alert", ofType: [String: Any].self).valueForKey("body")
        try userId = dict.valueForKey("senderId")
    }
}

class NotificationView: UIView {
    private var avatarImageView = ImageViewAsynchronous()
    private var nameLabel = UILabel()
    private var messageLabel = UILabel()
    private var separator = UIView()
    private var userUrl = ""

    override init(frame: CGRect) {
        super.init(frame: frame)

        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)

        setUpView()
    }

    private func setUpView() {
        backgroundColor = .white
        clipsToBounds = true
        avatarImageView.translatesAutoresizingMaskIntoConstraints = false
        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        messageLabel.translatesAutoresizingMaskIntoConstraints = false
        separator.translatesAutoresizingMaskIntoConstraints = false

        addSubview(avatarImageView)
        addSubview(nameLabel)
        addSubview(messageLabel)
        addSubview(separator)

        addConstraints(NSLayoutConstraint.constraints(
            withVisualFormat: "H:|-15-[avatar(35)]-12-[nameLabel]-15-|",
            options: [],
            metrics: nil,
            views: ["avatar": avatarImageView, "nameLabel": nameLabel]))

        addConstraint(NSLayoutConstraint(
            item: avatarImageView, attribute: .height, relatedBy: .equal, toItem: nil, attribute: .height, multiplier: 1, constant: 35
        ))
        addConstraint(NSLayoutConstraint(
            item: avatarImageView, attribute: .top, relatedBy: .equal, toItem: self, attribute: .top, multiplier: 1, constant: 12
        ))

        addConstraints(NSLayoutConstraint.constraints(
            withVisualFormat: "V:|-12-[nameLabel(19)]-4-[messageLabel(19)]-10-[separator(6)]",
            options: [],
            metrics: nil,
            views: ["nameLabel": nameLabel, "messageLabel": messageLabel, "separator": separator]))

        addConstraint(NSLayoutConstraint(
            item: messageLabel, attribute: .leading, relatedBy: .equal, toItem: nameLabel, attribute: .leading, multiplier: 1, constant: 0)
        )
        addConstraint(NSLayoutConstraint(
            item: messageLabel, attribute: .trailing, relatedBy: .equal, toItem: nameLabel, attribute: .trailing, multiplier: 1, constant: 0
        ))

        addConstraint(NSLayoutConstraint(
            item: separator, attribute: .centerX, relatedBy: .equal, toItem: self, attribute: .centerX, multiplier: 1, constant: 0
        ))
        addConstraint(NSLayoutConstraint(
            item: separator, attribute: .width, relatedBy: .equal, toItem: nil, attribute: .width, multiplier: 1, constant: 50
        ))

        nameLabel.font = UIFont.openSansSemiBold(size: 14)
        nameLabel.textColor = .defaultText
        messageLabel.font = UIFont.openSans(size: 14)
        messageLabel.textColor = .defaultText
        separator.layer.cornerRadius = 3
        separator.backgroundColor = .neutral700
        avatarImageView.clipsToBounds = true

        setNeedsLayout()
        layoutIfNeeded()

        avatarImageView.circular()

        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(showChat))
        addGestureRecognizer(tapGesture)

        let swipeGesture = UISwipeGestureRecognizer(target: self, action: #selector(hide))
        swipeGesture.direction = .up

        addGestureRecognizer(swipeGesture)
    }

    func show(model: NotificationViewModel) {
        self.userUrl = model.userId

        nameLabel.text = model.name
        messageLabel.text = model.message

        model.avatar.flatMap { avatarImageView.loadImage(withUrl: User.avatarUrl($0, imageSize: 100)) }

        UIApplication.shared.appDelegate?.window?.windowLevel = UIWindow.Level.statusBar + 1
        UIView.animate(withDuration: 0.3, animations: {
            self.frame.size.height = 75
        }, completion: { _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak self] in
                self?.hide()
            }
        })
    }

    @objc func hide() {
        UIApplication.shared.appDelegate?.window?.windowLevel = UIWindow.Level.normal
            UIView.animate(withDuration: 0.3, animations: {
                self.frame.size.height = 0
            }, completion: { _ in
                self.removeFromSuperview()
            })
    }

    @objc func showChat() {
        Router.showChat(action: .chat(userId: userUrl))
        hide()
    }
}
