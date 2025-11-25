import Foundation
import GoogleMaps

protocol MapPresenterProtocol: AnyObject {
    var searchForm: SearchForm { get }
    var forceHidePremium: Bool { get }
    var total: Int { get set }

    func onBackPressed()
    func update(bounds: GMSCoordinateBounds, zoom: Float)
    func toggleFavorite(user: User)
    func visitedPin(user: User)
    func getInitialLocation()
}

protocol MapView: BaseViewProtocol {
    func updateActiveFilters(_ count: Int)
    func showEntities(_ entities: UsersSearchEntities)
    func updateFavorite(user: User)
    func setInitialLocation(location: CLLocationCoordinate2D)
}
