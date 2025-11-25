import UIKit
import GoogleMaps

class SignUpAddressMapViewController: BaseViewController {
	var presenter: SignUpAddressMapPresenterProtocol!

    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var subTitleLabel: UILabel!
    @IBOutlet weak var vwMapContainer: UIView!
    @IBOutlet weak var addressStackView: UIStackView!
    @IBOutlet weak var addressLabel: UILabel!
    @IBOutlet weak var addressNextButton: UIButton!
    let locationMarker = GMSMarker()
    private var mapView: GMSMapView?

    override class var storyboard: UIStoryboard {
        return .auth
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        configureMapView()
        addBackButton()

        titleLabel.text = "signUp.address.map.title".localized
        subTitleLabel.text = "signUp.address.map.subTitle".localized
        addressNextButton.setTitle("Next".localized, for: .normal)

        locationMarker.icon = #imageLiteral(resourceName: "SelectedLocationPin")
        locationMarker.groundAnchor = CGPoint(x: 0.5, y: 0.5)
        addressStackView.isHidden = true
    }

// MARK: - Actions
    @IBAction func onNextButtonPressed() {
        presenter.updateAddress()
    }
}

extension SignUpAddressMapViewController: SignUpAddressMapViewProtocol {
    func configureMapView() {
        let options = GMSMapViewOptions()
        options.frame = view.bounds
        let gsMapView = GMSMapView(options: options)
        self.vwMapContainer.addSubview(gsMapView)
        gsMapView.delegate = self
        self.mapView = gsMapView
    }

    func configure(address: Address?) {
        self.addressStackView.isHidden = (address == nil)
        if let address {
            let paragraphStyle = NSMutableParagraphStyle()
            paragraphStyle.alignment = .center
            let attributedString = NSMutableAttributedString(
                string: "\n" + "Your address is near:".localized,
                attributes: [.font: UIFont.openSans(size: 14),
                             .foregroundColor: UIColor.white,
                             .paragraphStyle: paragraphStyle])
            attributedString.append(
                string: "\n\(address.houseNumber ?? "") \(address.street), \(address.city)\n",
                attributes: [.font: UIFont.openSansBold(size: 14),
                             .foregroundColor: UIColor.white,
                             .paragraphStyle: paragraphStyle])
            self.addressLabel.attributedText = attributedString
        }
    }

    func centerOnCoordinate(_ coordinate: CLLocationCoordinate2D) {
        loadViewIfNeeded()
        mapView?.animate(to: GMSCameraPosition.camera(withTarget: coordinate, zoom: 12))
    }

    func setBounds(_ bounds: MapBounds) {
        view.layoutIfNeeded()
        mapView?.moveCamera(GMSCameraUpdate.fit(bounds.gmsBounds))
    }
}

extension SignUpAddressMapViewController: GMSMapViewDelegate {
    func mapView(_ mapView: GMSMapView, didTapAt coordinate: CLLocationCoordinate2D) {
        if locationMarker.map == nil {
            locationMarker.map = mapView
        }
        locationMarker.position = coordinate

        presenter.onCoordinateSelected(coordinate)
    }
}
