import UIKit

class UndoHideUserCollectionViewCell: UICollectionViewCell {
    weak var delegate: UndoHideUserCollectionViewCellDelegate?
    var item: DispatchWorkItem?

    @IBOutlet weak var name: UILabel!
    @IBOutlet weak var undoButton: UIButton!

    override func prepareForReuse() {
        super.prepareForReuse()
        contentView.alpha = 1
    }

    func configure(delegate: UndoHideUserCollectionViewCellDelegate, user: User) {
        self.delegate = delegate
        name.text = String(format: "userIsNowHidden".localized, user.firstName) + " -"
        undoButton.setTitle("undo".localized, for: .normal)
    }

    @IBAction func undo(_ sender: Any) {
        UIView.animate(withDuration: 0.3, animations: {
            self.contentView.alpha = 0
        }, completion: { _ in
            self.delegate?.undoHideUser(cell: self)
        })
    }
}
