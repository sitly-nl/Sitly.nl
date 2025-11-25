import UIKit

class RecommendationUserCell: UICollectionViewCell {
    @IBOutlet weak var avatarImageView: ImageViewAsynchronous!
    @IBOutlet weak var userDescriptionLabel: UILabel!

    func configure(user: User) {
        avatarImageView.placeholderImage = user.placeholderImage
        avatarImageView.loadImage(withUrl: user.avatarUrl(imageSize: 80))

        let attributedString = NSMutableAttributedString(
            string: user.firstName,
            attributes: [
                .font: UIFont.openSans(size: 17),
                .foregroundColor: UIColor.defaultText
            ]
        )
        attributedString.append(
            string: "\n\(user.childrenCountString), \(user.childrenAgeRange) \("yo".localized)",
            attributes: [
                .font: UIFont.openSansLightItalic(size: 14),
                .foregroundColor: UIColor.defaultText
            ]
        )
        userDescriptionLabel.attributedText = attributedString
    }
}
