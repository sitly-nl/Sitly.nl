import UIKit
import GoogleMaps

extension GMSMapView {
    func setDefaultZoomRange() {
        setMinZoom(10, maxZoom: 16)
    }
}

class MapViewController: BaseViewController {
    var presenter: (MapPresenterProtocol & FilterUpdateDelegate)!
    var isHidden = false
    var entities = UsersSearchEntities.users([])
    var startingScrollingOffset = CGPoint.zero
    var markers = [GMSMarker]()
    var home: CLLocationCoordinate2D?
    var homeMarker: GMSMarker?
    private let defaultZoomLevel: Float = 13
    private var selectedUser: User?

    @IBOutlet private weak var cnPeopleHeight: NSLayoutConstraint!
    @IBOutlet private weak var mapView: GMSMapView!
    @IBOutlet private weak var filtersView: UIView!
    @IBOutlet private weak var filtersButton: UIButton!
    @IBOutlet private weak var activeFiltersView: CircularView!
    @IBOutlet private weak var peopleCollectionView: UICollectionView!

    override class var storyboard: UIStoryboard {
        return .search
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        peopleCollectionView.registerNib(ofType: UserCollectionViewCell.self)
        let longPressure = UILongPressGestureRecognizer(target: self, action: #selector(tappedFilters(sender:)))
        longPressure.minimumPressDuration = 0.001
        filtersView.addGestureRecognizer(longPressure)
        filtersButton.setTitle("filters".localized, for: .normal)

        configureMapView()
        addTopGradientBar()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        peopleCollectionView.reloadData()
    }

    // MARK: - Actions
    @IBAction func back(_ sender: Any) {
        presenter.onBackPressed()
        navigationController?.popViewController(animated: true)
    }

    @IBAction func showFilters(_ sender: Any) {
        FiltersWireframe().presentFrom(viewController: self, searchForm: presenter.searchForm, delegate: presenter, total: presenter.total)
    }

    @objc func tappedFilters(sender: UILongPressGestureRecognizer) {
        sender.cancelIfNeeded()

        if sender.state != .ended && sender.state != .cancelled {
            filtersButton.isHighlighted = true
            return
        }

        filtersButton.isHighlighted = false

        if sender.state == .ended {
            showFilters(sender)
        }
    }

    func selectMarker(marker: GMSMarker, scrollToPosition: Bool = true) {
        guard let user = marker.userData as? User else {
            return
        }

        if let previousMarker = mapView.selectedMarker as? MapUserMarker, !previousMarker.isEqual(marker) {
            previousMarker.selected = false
        } else {
            // Due to some weird Google Maps bug, selectedMarker is sometimes nil, but the view shows as selected.
            if mapView.selectedMarker == nil {
                markers.forEach {
                    if !$0.isEqual(marker) {
                        ($0 as? MapUserMarker)?.selected = false
                    }
                }
            }
        }

        mapView.selectedMarker = marker
        if let userMarker = marker as? MapUserMarker {
            userMarker.selected = true
        }

        presenter.visitedPin(user: user)
        selectedUser = user
        peopleCollectionView.reloadData()
    }

    @IBAction func goToMyLocation(_ sender: Any) {
        home.flatMap {
            setInitialLocation(location: $0)
        }
    }
}

// MARK: - MapView
extension MapViewController: MapView {
    func configureMapView() {
        mapView.delegate = self
        mapView.frame = self.view.bounds
        mapView.setDefaultZoomRange()
        presenter.getInitialLocation()
    }

    func updateActiveFilters(_ count: Int) {
        activeFiltersView.titleLabel?.text  = "\(count)"
    }

    func showEntities(_ entities: UsersSearchEntities) {
        self.entities = entities

        let selectedMarker = mapView.selectedMarker
        selectedMarker?.iconView = nil
        mapView.clear()
        markers.removeAll()
        setHomeMarker()

        setPeopleCollectionViewShown(entities.isUsers && entities.count > 0)

        switch entities {
        case .users(let users):
            cnPeopleHeight?.constant = UserCardView.viewHeight(isParent: users.first?.isParent ?? false)
            users.forEach { user in
                let marker = MapUserMarker(user: user)
                marker.map = self.mapView
                markers.append(marker)

                if user == users.first {
                    if selectedMarker == nil {
                        selectMarker(marker: marker)
                    } else if let selectedUser = selectedMarker?.userData as? User, !users.filter({ $0.id.equalsIgnoreCase(selectedUser.id) }).any {
                        selectMarker(marker: marker)
                    }
                } else {
                    if let selectedUser = selectedMarker?.userData as? User, user.id.equalsIgnoreCase(selectedUser.id) {
                        selectMarker(marker: marker)
                    }
                }
            }
        case .groups(let groups):
            groups.forEach {
                let marker = MapUsersGroupMarker(usersGroups: $0)
                marker.map = self.mapView
                markers.append(marker)
            }
        }
    }

    func updateFavorite(user: User) {
        if let cell = peopleCollectionView.visibleCells.first as? UserCollectionViewCell,
           cell.user?.id == user.id {
            cell.user = user
            selectedUser = user
            cell.userCardViewModel?.isFavorite = user.isFavorite
        }
    }

    func setInitialLocation(location: CLLocationCoordinate2D) {
        home = location
        mapView.camera = GMSCameraPosition.camera(withTarget: location, zoom: defaultZoomLevel)
        setHomeMarker()
    }

    func setHomeMarker() {
         if let home = home, homeMarker?.map == nil {
            homeMarker = GMSMarker(position: home)
            homeMarker?.icon = #imageLiteral(resourceName: "pin_home")
            homeMarker?.map = self.mapView
        }
    }

    func setPeopleCollectionViewShown(_ shown: Bool) {
        peopleCollectionView.isHidden = !shown
        UIView.animate(withDuration: UIView.defaultAnimationDuration) { [weak self] in
            self?.peopleCollectionView.alpha = shown ? 1 : 0
        }
        peopleCollectionView.reloadData()
    }
}

// MARK: - GMSMapViewDelegate
extension MapViewController: GMSMapViewDelegate {
    func mapView(_ mapView: GMSMapView, idleAt position: GMSCameraPosition) {
        let bounds = GMSCoordinateBounds(region: mapView.projection.visibleRegion())
        presenter.update(bounds: bounds, zoom: mapView.camera.zoom)
    }

    func mapView(_ mapView: GMSMapView, didTap marker: GMSMarker) -> Bool {
        if let groupMarker = marker as? MapUsersGroupMarker {
            mapView.camera = GMSCameraPosition.camera(withTarget: groupMarker.usersGroups.coordinate, zoom: mapView.camera.zoom + 1)
        } else {
            selectMarker(marker: marker)
        }
        return true
    }
}

// MARK: - UICollectionViewDataSource
extension MapViewController: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return selectedUser != nil ? 1 : 0
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(ofType: UserCollectionViewCell.self, for: indexPath)

        if let selectedUser {
            cell.configure(
                delegate: self,
                user: selectedUser,
                type: .map,
                forceHidePremium: presenter?.forceHidePremium ?? false
            )
        }

        return cell
    }

    func collectionView(
        _ collectionView: UICollectionView,
        layout collectionViewLayout: UICollectionViewLayout,
        insetForSectionAt section: Int
    ) -> UIEdgeInsets {
        return UIEdgeInsets(top: 0, left: .spM, bottom: 0, right: 0)
    }
}

// MARK: - UICollectionViewDelegateFlowLayout
extension MapViewController: UICollectionViewDelegateFlowLayout {
    func collectionView(
        _ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath
    ) -> CGSize {
        return CGSize(width: UIScreen.main.bounds.width - .spM, height: cnPeopleHeight.constant)
    }
}

// MARK: - UserCollectionViewCellDelegate
extension MapViewController: UserCollectionViewCellDelegate {
    func presentingSwipeAction(userId: String) {
    }

    func hideUser(cell: UserCollectionViewCell) {
    }

    func toggleFavorite(user: User) {
        presenter.toggleFavorite(user: user)
    }

    func showUser(cell: UserCollectionViewCell) {
        if let selectedUser {
            navigationController?.pushViewController(Router.publicProfile(user: selectedUser), animated: true)
        }
    }
}
