import UIKit

class SavedViewController: BaseViewController {
    var presenter: SavedPresenterProtocol?
    private var favorites = [User]()
    private var cardHeight: CGFloat = 208

    @IBOutlet private weak var titleLabel: UILabel!
    @IBOutlet private weak var favoritesCollectionView: UICollectionView!

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        tabBarItem.title = "saved".localized
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        presenter?.viewDidLoad()

        tabBarItem.image = #imageLiteral(resourceName: "saved_menu").withRenderingMode(.alwaysOriginal)
        tabBarItem.selectedImage = #imageLiteral(resourceName: "saved_menu_selected").withRenderingMode(.alwaysOriginal)

        titleLabel.font = .openSans(size: 17)
        titleLabel.text = "saved".localized

        favoritesCollectionView.registerNib(ofType: UserCollectionViewCell.self)
        favoritesCollectionView.contentInset = UIEdgeInsets(top: 20, left: 0, bottom: 20, right: 0)
        favoritesCollectionView.alpha = 0
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        presenter?.getFavorites()
    }

    override func needsToShowActivityIndicator() -> Bool {
        return favorites.count == 0
    }
}

// MARK: - SavedView
extension SavedViewController: SavedView {
    func updateView(for favorites: [User]) {
        cardHeight = UserCardView.viewHeight(isParent: favorites.first?.isParent ?? false)
        let wasEmpty = self.favorites.count == 0
        self.favorites = favorites
        favoritesCollectionView.reloadData()

        UIView.animate(withDuration: (wasEmpty ? 0.3 : 0)) { [weak self] in
            self?.favoritesCollectionView.alpha = 1
        }
    }

    func noDataView() {
        favoritesCollectionView.reloadData()
    }
}

// MARK: - UICollectionViewDataSource
extension SavedViewController: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return favorites.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(ofType: UserCollectionViewCell.self, for: indexPath)
        if let user = favorites[safe: indexPath.item] {
            cell.configure(delegate: self, user: user, forceHidePremium: presenter?.forceHidePremium ?? false)
        }
        return cell
    }
}

// MARK: - UserCollectionViewCellDelegate
extension SavedViewController: UserCollectionViewCellDelegate {
    func hideUser(cell: UserCollectionViewCell) {}

    func presentingSwipeAction(userId: String) {}

    func toggleFavorite(user: User) {
        if let index = favorites.firstIndex(of: user) {
            favorites.remove(at: index)
            favoritesCollectionView.performBatchUpdates({
                favoritesCollectionView.deleteItems(at: [IndexPath(item: index, section: 0)])
            }, completion: ({ _ in
                self.presenter?.remove(favorite: user)
            }))
        }
        AnalyticsManager.logEvent(.savedRemove)
    }

    func showUser(cell: UserCollectionViewCell) {
        if let indexPath = favoritesCollectionView.indexPath(for: cell),
           let user = favorites[safe: indexPath.item] {
            navigationController?.pushViewController(Router.publicProfile(user: user), animated: true)
            AnalyticsManager.logEvent(.savedClickProfile)
        }
    }
}

// MARK: - UICollectionViewDelegateFlowLayout
extension SavedViewController: UICollectionViewDelegateFlowLayout {
    func collectionView(
        _ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath
    ) -> CGSize {
        return CGSize(width: collectionView.frame.width, height: cardHeight)
    }
}
