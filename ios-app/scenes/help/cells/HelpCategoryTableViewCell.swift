import UIKit

class HelpCategoryTableViewCell: UITableViewCell {
    @IBOutlet weak var categoryLabel: UILabel!

    func configure(category: HelpCategory) {
        categoryLabel.text = category.name.localized
    }
}
