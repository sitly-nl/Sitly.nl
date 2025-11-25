import Foundation
import GoogleMaps

class MapPresenter {
    let searchService: SearchServiceable
    let favoriteService: FavoriteServiceable
    let userService: UserServiceable
    private let configService: ConfigServiceable
    weak var view: MapView?
    weak var delegate: SearchResultsHandler?

    var total = 0
    var searchForm: SearchForm

    private var pendingSearchForm: SearchForm?
    private var loadingUsers = false

    init(
        view: MapView,
        searchService: SearchServiceable,
        favoriteService: FavoriteServiceable,
        userService: UserServiceable,
        configService: ConfigServiceable
    ) {
        self.view = view
        self.searchService = searchService
        self.favoriteService = favoriteService
        self.userService = userService
        self.configService = configService

        let form = searchService.getRestoredSearchForm()
        form.searchType = .map
        searchForm = form
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(onFavoriteToggled),
            name: .toggledFavorite,
            object: nil
        )
    }

    func didResetSearchForm(searchForm: SearchForm) {
        self.searchForm = searchForm
        delegate?.didResetSearchForm(form: searchForm)
        search(searchForm: searchForm)
    }

    @objc func onFavoriteToggled(notification: Notification) {
        if let user = notification.object as? User {
            view?.updateFavorite(user: user)
        }
    }
}

// MARK: - MapPresenterProtocol
extension MapPresenter: MapPresenterProtocol {
    var forceHidePremium: Bool {
        configService.forceHidePremium
    }

    func onBackPressed() {
        if let searchVc = (view as? MapViewController)?.navigationController?.previousViewController as? SearchViewController {
            searchVc.presenter?.searchWithRestoredFiters()
        }
    }

    func update(bounds: GMSCoordinateBounds, zoom: Float) {
        searchForm.bounds = [
            .north: bounds.northEast.latitude,
            .east: bounds.northEast.longitude,
            .south: bounds.southWest.latitude,
            .west: bounds.southWest.longitude
        ]
        searchForm.zoom = Int(zoom)
        search(searchForm: searchForm)
    }

    func toggleFavorite(user: User) {
        favoriteService.toggleFavorite(user: user) { response in
            if case .success = response {
                self.view?.updateFavorite(user: user)
            }
        }
    }

    func visitedPin(user: User) {
        userService.updateVisitedPin(user: user)
    }

    func getInitialLocation() {
        view?.setInitialLocation(location: userService.fetchMe()?.location ?? CLLocationCoordinate2D())
    }
}

// MARK: - FilterUpdateDelegate
extension MapPresenter: FilterUpdateDelegate {
    func search(searchForm: SearchForm) {
        searchForm.searchType = .map
        if searchForm.bounds == nil {
            return
        }

        if loadingUsers {
            pendingSearchForm = searchForm
            return
        }
        loadingUsers = true

        self.view?.updateActiveFilters(self.searchService.numberOfActiveFilters(searchForm: searchForm))
        self.searchService.search(searchForm: searchForm) {
            if case .success(let result) = $0 {
                self.total = result.total
                self.delegate?.found(total: result.total)
                self.view?.showEntities(result.entities)
            }

            self.loadingUsers = false
            if let searchForm = self.pendingSearchForm {
                self.pendingSearchForm = nil
                self.search(searchForm: searchForm)
            }
        }
    }

    func resetSearchForm() {
        let form = searchService.resetSearchForm(searchForm: searchForm)
        self.didResetSearchForm(searchForm: form)
    }
}
