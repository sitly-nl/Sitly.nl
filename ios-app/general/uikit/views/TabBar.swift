import UIKit

class TabBar: UITabBar {
    override init(frame: CGRect) {
        super.init(frame: frame)

        setUp()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)

        setUp()
    }

    override func prepareForInterfaceBuilder() {
        super.prepareForInterfaceBuilder()
        setUp()
    }

    /// Configure the view.
    func setUp() {
        // Use an empty UIImage else it will still show the top border
        self.shadowImage = #imageLiteral(resourceName: "border-menu")
        self.backgroundImage = UIImage()
        self.backgroundColor = UIColor.white
        self.isTranslucent = false
    }
}
