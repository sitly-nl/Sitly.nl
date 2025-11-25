import UIKit

class HelpQuestionTableViewCell: UITableViewCell {
    @IBOutlet weak var questionLabel: UILabel!
    @IBOutlet weak var toggleImageView: UIImageView!
    @IBOutlet weak var answerTextView: TextView!
    @IBOutlet weak var answerBottom: NSLayoutConstraint!
    @IBOutlet weak var separator: UIView!

    func configure(question: HelpQuestion, expanded: Bool, isLast: Bool) {
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineHeightMultiple = 1.5
        answerTextView.attributedText =
            NSAttributedString(
                string: expanded ? question.answer : "",
                attributes: [
                    .paragraphStyle: paragraphStyle,
                    .font: UIFont.openSansLight(size: 14),
                    .foregroundColor: UIColor.defaultText
                ]
            )

        questionLabel.text = question.question
        answerTextView.textContainerInset = expanded ? UIEdgeInsets(top: 16, left: 0, bottom: 0, right: 0) : .zero
        toggleImageView.image = expanded ? #imageLiteral(resourceName: "collapse") : #imageLiteral(resourceName: "expand")
        answerBottom.constant = expanded ? 16 : 0
        separator.isHidden = isLast
    }

    override func setHighlighted(_ highlighted: Bool, animated: Bool) {
        super.setHighlighted(highlighted, animated: animated)

        let alpha: CGFloat = highlighted ? 0.5 : 1
        questionLabel.alpha = alpha
        toggleImageView.alpha = alpha
    }
}
