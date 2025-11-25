import MapKit

extension Notification.Name {
	static let locationUpdated = Notification.Name("locationUpdated")
	static let locationManagerDidChangeAuthorization = Notification.Name("locationManagerDidChangeAuthorization")
}

class LocationManager: NSObject {
	var location: CLLocation? {
		return locationManager.location
	}
    var locationServicesDisabled: Bool {
        return (locationManager.authorizationStatus == .restricted) || (locationManager.authorizationStatus == .denied)
    }

	private let locationManager = CLLocationManager()

// MARK: - Override
	override init() {
		super.init()

		locationManager.delegate = self
		locationManager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
	}

	func requestAuthorization() {
		locationManager.requestWhenInUseAuthorization()
	}
}

extension LocationManager: CLLocationManagerDelegate {
    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if  status == .authorizedAlways ||
            status == .authorizedWhenInUse {
                locationManager.startUpdatingLocation()
        }

        NotificationCenter.default.post(name: .locationManagerDidChangeAuthorization, object: status)
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        locations.last.flatMap { NotificationCenter.default.post(name: .locationUpdated, object: $0) }
    }
}
