import UIKit

class JobPostingExplanationViewController: PopUpContainerViewController {
    var showJobPostingSearch: ( () -> Void )?
    var showClose = false

    override func viewDidLoad() {
        super.viewDidLoad()

        let stackView = UIStackView(arrangedSubviews: [
            imageView(image: #imageLiteral(resourceName: "JobPostingCalendarIcon")),
            label(text: "popUp.jobPosting.info.text.1".localized),
            imageView(image: #imageLiteral(resourceName: "JobPostingNotifyIcon")),
            label(text: "popUp.jobPosting.info.text.2".localized),
            imageView(image: #imageLiteral(resourceName: "JobPostingChatIcon")),
            label(text: "popUp.jobPosting.info.text.3".localized)
        ])
        stackView.translatesAutoresizingMaskIntoConstraints = false
        stackView.axis = .vertical
        stackView.spacing = 15

        let scrollView = UIScrollView.autolayoutInstance()
        scrollView.addSubview(stackView)
        NSLayoutConstraint.attachToSuperview(view: stackView)
        NSLayoutConstraint.activate([
            stackView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
            scrollView.heightAnchor.constraint(equalToConstant: min(0.55*UIScreen.main.bounds.height, 350))
        ])

        let button: UIButton
        if showClose {
            button = PopUpView.ButtonType.primary.button(
                title: "close".localized,
                target: self,
                selector: #selector(onClosePressed))
        } else {
            button = PopUpView.ButtonType.primary.button(
                title: "popUp.jobPosting.info.action".localized,
                target: self,
                selector: #selector(onOkPressed))
        }
        let popUpView = PopUpView(
            title: "popUp.jobPosting.info.title".localized,
            customView: scrollView,
            buttons: [button])
        popUpView.titleLabel.font = UIFont.openSansSemiBold(size: 17)
        popUpView.descriptionContainer.backgroundColor = .clear
        loadViewToContainer(popUpView)
    }

    private func imageView(image: UIImage) -> UIImageView {
        let imageView = UIImageView.autolayoutInstance()
        imageView.image = image
        imageView.contentMode = .center
        return imageView
    }

    private func label(text: String) -> UILabel {
        let label = UILabel.autolayoutInstance()
        label.numberOfLines = 0
        label.text = text
        label.font = UIFont.openSansLight(size: 17)
        label.textAlignment = .center
        label.textColor = .black
        return label
    }

// MARK: - Actions
    @objc private func onOkPressed() {
        showJobPostingSearch?()
    }
}
