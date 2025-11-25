import UIKit

class ConnectionErrorViewController: BaseViewController {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var imageView: UIImageView!
    @IBOutlet weak var descriptionLabel: UILabel!

    var connectionErrorType = ConnectionErrorType.offline

    override func viewDidLoad() {
        super.viewDidLoad()

        modalPresentationCapturesStatusBarAppearance = true
        view.backgroundColor = .clear
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        titleLabel.text = connectionErrorType.title
        descriptionLabel.text = connectionErrorType.description
        imageView.image = connectionErrorType.image
    }

    @IBAction func close(_ sender: Any) {
        dismiss(animated: true)
    }
}
