import UIKit

class UserCollectionViewCell: UICollectionViewCell {
    @IBOutlet weak var containerView: UIView!

    weak var delegate: UserCollectionViewCellDelegate?
    var userCardViewModel: UserCardViewModel?
    var user: User?

    override func prepareForReuse() {
        super.prepareForReuse()
        containerView.removeSubviews()
        delegate = nil
        userCardViewModel = nil
        user = nil
    }

    func configure(
        delegate: UserCollectionViewCellDelegate,
        user: User,
        type: UserCardKind = .generic,
        forceHidePremium: Bool,
        hasSwipeAction: Bool = false
    ) {
        self.delegate = delegate
        self.user = user
        let cardViewModel = UserCardViewModel(
            user: UserDTO(user: user),
            cardKind: type,
            isViewed: true,
            forceHidePremium: forceHidePremium,
            swipeAction: hasSwipeAction ? .hide : nil
        ) { [weak self] action in
            self?.handle(action: action)
        }
        userCardViewModel = cardViewModel
        let userCardView = UserCardView().environmentObject(cardViewModel)
        userCardView.embedIn(view: containerView)
    }

    private func handle(action: (SwipeActionKind, UserCardViewModel)) {
        guard let user else {
            return
        }
        switch action.0 {
        case .addFavorite, .removeFavorite:
            delegate?.toggleFavorite(user: user)
        case .hide, .unhide:
            delegate?.hideUser(cell: self)
        case .selected:
            delegate?.showUser(cell: self)
        case .presentingSwipeAction:
            delegate?.presentingSwipeAction(userId: user.id)
        case .delete:
            break
        }
    }
}
