import UIKit

class HelpContactTableViewCell: UITableViewCell {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var contactButton: UIButton!

    var url: URL?

    override func awakeFromNib() {
        super.awakeFromNib()

        contactButton.layer.cornerRadius = 3
        contactButton.layer.borderColor = UIColor.primary500.cgColor
        contactButton.layer.borderWidth = 2
        titleLabel.text = "cantFindAnswer".localized
        contactButton.setTitle("contactUs".localized, for: .normal)
    }

    @IBAction func contactUs(_ sender: Any) {
        if let url {
            UIApplication.shared.open(url, options: [:])
            AnalyticsManager.logEvent(.helpClickContactUs)
        }
    }
}
