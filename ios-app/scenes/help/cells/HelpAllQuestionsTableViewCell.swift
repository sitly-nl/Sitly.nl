import UIKit

class HelpAllQuestionsTableViewCell: UITableViewCell {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var arrowImageView: UIImageView!

    func configure(category: HelpCategory) {
        titleLabel.text = String(format: "allQuestionsAbout".localized, category.name.lowercased())
        arrowImageView.image = #imageLiteral(resourceName: "arrow").withRenderingMode(.alwaysTemplate)
    }

    override func setHighlighted(_ highlighted: Bool, animated: Bool) {
        super.setHighlighted(highlighted, animated: animated)
        let alpha: CGFloat = highlighted ? 0.5 : 1
        titleLabel.alpha = alpha
        arrowImageView.alpha = alpha
    }
}
