import UIKit
import GoogleMaps

class MapUsersGroupMarker: GMSMarker {
    let usersGroups: UsersGroups
    let label = UILabel.autolayoutInstance()

    init(usersGroups: UsersGroups) {
        self.usersGroups = usersGroups
        super.init()

        let view = MapUsersGroupView.autolayoutInstance()
        view.image = #imageLiteral(resourceName: "UsersCluster")
        view.title = "\(usersGroups.count)"
        iconView = view

        position = usersGroups.coordinate
    }
}
