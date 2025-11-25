import Foundation

class SavedPresenter {
    weak var view: SavedView?
    var favoriteService: FavoriteServiceable
    private let configService: ConfigServiceable

    init(view: SavedView, favoriteService: FavoriteServiceable, configService: ConfigServiceable) {
        self.favoriteService = favoriteService
        self.configService = configService
        self.view = view
    }

    @objc func onFavoriteToggled(notification: Notification) {
        if let user = notification.object as? User, user.isFavorite {
            getFavorites()
        }
    }
}

// MARK: - SavedPresenterProtocol
extension SavedPresenter: SavedPresenterProtocol {
    func viewDidLoad() {
        NotificationCenter.default.addObserver(self, selector: #selector(onFavoriteToggled), name: .toggledFavorite, object: nil)
    }

    var forceHidePremium: Bool {
        configService.forceHidePremium
    }

    func getFavorites() {
        self.view?.updateView(for: favoriteService.fetchFavorites())

        view?.showActivityIndicator()
        favoriteService.getFavorites {
            self.view?.hideActivityIndicator()
            switch $0 {
            case .success(let favorites):
                self.view?.updateView(for: favorites)
            case .failure:
                self.view?.noDataView()
            }
        }
    }

    func remove(favorite: User) {
        favoriteService.toggleFavorite(user: favorite) { _ in }
    }
}
