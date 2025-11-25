import UIKit
import GoogleMaps

class MapUserMarker: GMSMarker {
    let user: User
    var selected: Bool = false {
        didSet {
            zIndex = selected ? 1 : 0
            if selected {
                mapIconView.loadImage(withUrl: user.avatarUrl(imageSize: MapUserMarker.avatarDimension))
                iconView = mapIconView
            } else {
                iconView = nil
                updteIcon()
            }
        }
    }
    private static let avatarDimension: CGFloat = 40
    private var mapIconView = MapIconView(frame: CGRect(x: 0, y: 0, width: MapUserMarker.avatarDimension, height: MapUserMarker.avatarDimension))

    init(user: User) {
        self.user = user
        super.init()

        mapIconView.placeholderImage = user.placeholderImage
        userData = user
        position = user.location
        updteIcon()
    }

    func updteIcon() {
        if user.hasVisitedPin {
            icon = user.isFavorite ? #imageLiteral(resourceName: "pin_favourite_visited") : #imageLiteral(resourceName: "pin_visited")
        } else {
            icon = user.isFavorite ? #imageLiteral(resourceName: "pin_favourite") : #imageLiteral(resourceName: "pin")
        }
    }
}
