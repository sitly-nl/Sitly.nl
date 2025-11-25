import Foundation
import GoogleMapsBase

struct MapBounds {
    let north: Double
    let east: Double
    let south: Double
    let west: Double

    var gmsBounds: GMSCoordinateBounds {
        return GMSCoordinateBounds(
            coordinate: CLLocationCoordinate2D(latitude: north, longitude: east),
            coordinate: CLLocationCoordinate2D(latitude: south, longitude: west)
        )
    }
}
