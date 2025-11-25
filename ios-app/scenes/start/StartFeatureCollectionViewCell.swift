import UIKit

class StartFeatureCollectionViewCell: UICollectionViewCell {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var imageView: UIImageView!

    func configure(feature: StartFeature) {
        titleLabel.text = feature.title
        imageView.image = feature.image
    }
}
