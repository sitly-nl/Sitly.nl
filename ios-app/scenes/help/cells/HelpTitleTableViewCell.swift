import UIKit

class HelpTitleTableViewCell: UITableViewCell {
    @IBOutlet weak var titleLabel: UILabel!

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "helpProfile".localized
    }
}
