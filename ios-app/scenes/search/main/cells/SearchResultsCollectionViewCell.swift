import UIKit

class SearchResultsCollectionViewCell: UICollectionViewCell {
    @IBOutlet weak var label: UILabel!
    @IBOutlet weak var buttonShowHiddenUsers: UIButton!
    weak var delegate: SearchResultsCollectionViewCellDelegate?

    func configure(results: Int, hidden: Int, role: Role, delegate: SearchResultsCollectionViewCellDelegate) {
        self.delegate = delegate

        let hasHiddenUsers = hidden > 0
        buttonShowHiddenUsers.isHidden = !hasHiddenUsers
        if hasHiddenUsers {
            buttonShowHiddenUsers.setTitle(
                "  \(hidden) \("hidden".localized.lowercased())  ",
                for: .normal)
            buttonShowHiddenUsers.titleLabel?.backgroundColor = .neutral900
            buttonShowHiddenUsers.layoutIfNeeded()
            buttonShowHiddenUsers.titleLabel?.layer.cornerRadius = (buttonShowHiddenUsers.titleLabel?.frame.height ?? 16)/2
            buttonShowHiddenUsers.titleLabel?.layer.masksToBounds = true
        }

        let style = NSMutableParagraphStyle()
        style.alignment = .center
        label.attributedText = NSAttributedString(
            string: "\(results) \(role.title.lowercased())",
            attributes: [
                .font: UIFont.openSans(size: 14),
                .foregroundColor: UIColor.defaultText,
                .paragraphStyle: style]
        )
    }

    @IBAction func showHiddenUsers() {
        delegate?.showHidden()
    }
}
