import Foundation

protocol TitleButtonCollectionViewCellDelegate: AnyObject {
    func didToggle(on: Bool, button: TitleToggleButton, cell: TitleButtonCollectionViewCell)
}
