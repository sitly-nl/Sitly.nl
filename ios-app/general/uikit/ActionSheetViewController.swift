import UIKit

class ActionSheetViewController: UIViewController {
    struct Action {
        let attributedTitle: NSAttributedString
        let icon: UIImage
        let handler: () -> Void
    }

    private let actions: [Action]
    private let stackContainerView = UIVisualEffectView.autolayoutInstance()
    private let stackView = UIStackView.autolayoutInstance()
    private let cancelButtonContainerView = UIVisualEffectView.autolayoutInstance()
    private let cancelButton = UIButton.autolayoutInstance()

    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    init(actions: [Action]) {
        self.actions = actions

        super.init(nibName: nil, bundle: nil)

        modalPresentationStyle = .overFullScreen
        modalTransitionStyle = .crossDissolve
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = UIColor.black.withAlphaComponent(0.25)

        actions.enumerated().forEach { (index, action) in
            if index != 0 {
                let separator = UIView.autolayoutInstance()
                separator.backgroundColor = UIColor.black.withAlphaComponent(0.2)
                separator.heightAnchor.constraint(equalToConstant: 1).isActive = true
                stackView.addArrangedSubview(separator)
            }

            let button = UIButton.autolayoutInstance()
            button.tag = index
            let attributedTitle = NSMutableAttributedString(string: "   ", attributes: [:])
            attributedTitle.append(action.attributedTitle)
            button.setAttributedTitle(attributedTitle, for: .normal)
            button.setImage(action.icon, for: .normal)
            button.addTarget(self, action: #selector(onButtonPresse(sender:)), for: .touchUpInside)
            button.heightAnchor.constraint(equalToConstant: 57).isActive = true
            stackView.addArrangedSubview(button)
        }

        stackContainerView.cornerRadius = 13
        stackContainerView.effect = UIBlurEffect(style: .extraLight)
        stackContainerView.contentView.addSubview(stackView)
        view.addSubview(stackContainerView)

        stackView.axis = .vertical

        cancelButton.setTitle("cancel".localized, for: .normal)
        cancelButton.setTitleColor(.defaultText, for: .normal)
        cancelButton.addTarget(self, action: #selector(close), for: .touchUpInside)
        cancelButtonContainerView.cornerRadius = 13
        cancelButtonContainerView.effect = UIBlurEffect(style: .extraLight)
        cancelButtonContainerView.contentView.addSubview(cancelButton)
        view.addSubview(cancelButtonContainerView)

        NSLayoutConstraint.attachToSuperview(view: stackView)
        NSLayoutConstraint.attachToSuperview(view: cancelButton)
        NSLayoutConstraint.activate([
            stackContainerView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            stackContainerView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
            cancelButtonContainerView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            cancelButtonContainerView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),
            cancelButtonContainerView.heightAnchor.constraint(equalToConstant: 57),
            cancelButtonContainerView.topAnchor.constraint(equalTo: stackContainerView.bottomAnchor, constant: 8),
            cancelButtonContainerView.bottomAnchor.constraint(equalTo: view.layoutMarginsGuide.bottomAnchor, constant: -10)
        ])

        view.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(close)))
    }

// MARK: - Actions
    @objc func onButtonPresse(sender: UIButton) {
        close()
        actions[sender.tag].handler()
    }

    @objc func close() {
        dismiss(animated: true)
    }
}
