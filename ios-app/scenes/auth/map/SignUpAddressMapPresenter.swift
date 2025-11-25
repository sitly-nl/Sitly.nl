import Foundation
import MapKit

class SignUpAddressMapPresenter: BasePresenter, ServerServiceInjected, LocationManagerInjected {
	weak var view: SignUpAddressMapViewProtocol?
    var showNext: (() -> Void)?

    private var address: Address?

    init(view: SignUpAddressMapViewProtocol?, initialBounds: MapBounds? = nil) {
        super.init(baseView: view)
        self.view = view

        if let initialBounds {
            view?.setBounds(initialBounds)
        } else {
            if let location = locationManager.location {
                view?.centerOnCoordinate(location.coordinate)
            } else {
                locationManager.requestAuthorization()
                var requestedLocationUpdate = true
                appendNotificationToken(NotificationCenter.default.addObserver(forName: .locationUpdated, object: nil, queue: nil) { notification in
                    if requestedLocationUpdate {
                        requestedLocationUpdate = false
                        if let location = notification.object as? CLLocation {
                            self.view?.centerOnCoordinate(location.coordinate)
                        }
                    }
                })
            }
        }
    }
}

extension SignUpAddressMapPresenter: SignUpAddressMapPresenterProtocol {
    func onCoordinateSelected(_ coordinate: CLLocationCoordinate2D) {
        serverManager.reversGeocode(coordinate: coordinate) {
            self.address = try? $0.get()
            self.address?.coordinate = coordinate
            if  let countryCode = UserDefaults.countryCode,
                let country = Country(rawValue: countryCode),
                !country.showPostalCode {
                    self.address?.postalCode = nil
            }
            self.view?.configure(address: try? $0.get())
        }
    }

    func updateAddress() {
        address.flatMap {
            updateMe(type: .address($0))
        }
    }
}
