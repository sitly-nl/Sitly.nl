import Foundation

protocol UserCollectionViewCellDelegate: AnyObject {
    func hideUser(cell: UserCollectionViewCell)
    func toggleFavorite(user: User)
    func showUser(cell: UserCollectionViewCell)
    func presentingSwipeAction(userId: String)
}
