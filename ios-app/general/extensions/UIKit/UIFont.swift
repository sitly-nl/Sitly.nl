import UIKit

extension UIFont {
    @nonobjc class func openSansBold(size: CGFloat) -> UIFont {
        return UIFont(name: "OpenSans-Bold", size: size) ?? UIFont.boldSystemFont(ofSize: size)
    }

    @nonobjc class func openSansLight(size: CGFloat) -> UIFont {
        return UIFont(name: "OpenSans-Light", size: size) ?? UIFont.boldSystemFont(ofSize: size)
    }

    @nonobjc class func openSans(size: CGFloat) -> UIFont {
        return UIFont(name: "OpenSans", size: size) ?? UIFont.systemFont(ofSize: size)
    }

    @nonobjc class func openSansSemiBold(size: CGFloat) -> UIFont {
        return UIFont(name: "OpenSans-Semibold", size: size) ?? UIFont.boldSystemFont(ofSize: size)
    }

    @nonobjc class func openSansSemiboldItalic(size: CGFloat) -> UIFont {
        return UIFont(name: "OpenSans-SemiboldItalic", size: size) ?? UIFont.boldSystemFont(ofSize: size)
    }

    @nonobjc class func openSansItalic(size: CGFloat) -> UIFont {
        return UIFont(name: "OpenSans-Italic", size: size) ?? UIFont.systemFont(ofSize: size)
    }

    @nonobjc class func openSansLightItalic(size: CGFloat) -> UIFont {
        return UIFont(name: "OpenSansLight-Italic", size: size) ?? UIFont.systemFont(ofSize: size)
    }

    @nonobjc class func openSansBoldItalic(size: CGFloat) -> UIFont {
        return UIFont(name: "OpenSans-BoldItalic", size: size) ?? UIFont.systemFont(ofSize: size)
    }

    static var body2: UIFont { UIFont.openSans(size: 16) }
    static var body3: UIFont { UIFont.openSans(size: 14) }
    static var body4: UIFont { UIFont.openSans(size: 12) }
    static var body5: UIFont { UIFont.openSans(size: 10) }
    static var heading4: UIFont { UIFont.openSansBold(size: 18) }
    static var heading5: UIFont { UIFont.openSansBold(size: 16) }
    static var heading6: UIFont { UIFont.openSansBold(size: 14) }

}
