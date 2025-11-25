import Foundation
import MapKit

protocol SignUpAddressMapPresenterProtocol: SignUpUpdateUserProtocol {
    var view: SignUpAddressMapViewProtocol? { get set }
    func onCoordinateSelected(_ coordinate: CLLocationCoordinate2D)
    func updateAddress()
}

protocol SignUpAddressMapViewProtocol: BaseViewProtocol {
    var presenter: SignUpAddressMapPresenterProtocol! { get set }
    func configure(address: Address?)
    func centerOnCoordinate(_ coordinate: CLLocationCoordinate2D)
    func setBounds(_ bounds: MapBounds)
}
