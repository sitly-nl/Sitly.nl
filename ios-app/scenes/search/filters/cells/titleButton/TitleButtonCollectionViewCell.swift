import UIKit

class TitleButtonCollectionViewCell: UICollectionViewCell, TitleToggleButtonDelegate {
    @IBOutlet weak var titleButton: TitleToggleButton!
    weak var delegate: TitleButtonCollectionViewCellDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()

        titleButton.delegate = self
    }

    func configure(text: String, state: UIControl.State, delegate: TitleButtonCollectionViewCellDelegate) {
        titleButton.titleLabel.text = text
        titleButton.configure(for: state)
        self.delegate = delegate
    }

    // MARK: - TitleToggleButtonDelegate
    func didToggle(on: Bool, sender: TitleToggleButton) {
        delegate?.didToggle(on: on, button: sender, cell: self)
    }
}
